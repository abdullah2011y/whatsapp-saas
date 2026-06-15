import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAction } from "../../shared/services/audit.service";
import { authMiddleware, AuthenticatedRequest } from "./auth.middleware";
import { generateSecret, verifyTOTP } from "../../shared/lib/totp";
import QRCode from "qrcode";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// POST /auth/signup
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password, company } = req.body;
    
    if (email) email = email.trim().toLowerCase();

    console.log(`[Auth] Signup attempt for email: ${email}`);

    if (!name || !email || !password) {
      console.log(`[Auth] Signup failed: Missing credentials`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`[Auth] Signup failed: User already exists for email: ${email}`);
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        company: company || null,
        role: "USER",
        status: "ACTIVE",
        plan: "Free"
      },
    });

    const payload = { userId: user.id, email: user.email, role: user.role, status: user.status };
    console.log(`[AUTH] JWT payload before signing: ${JSON.stringify(payload)}`);
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`[Auth] Token generated for new user: ${email}`);

    await logAction(user.id, "USER_SIGNUP", user.id, `User ${user.email} signed up successfully.`);

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        plan: user.plan,
        licenseKey: user.licenseKey,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    
    if (email) email = email.trim().toLowerCase();

    console.log(`[Auth] Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log(`[Auth] Login failed: Missing credentials`);
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[Auth] Login failed: User not found for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    console.log(`[Auth] User found for email: ${email}`);
    console.log(`[AUTH] Database role: ${user.role}`);
    console.log(`[AUTH] User status: ${user.status}`);

    if (user.status === "SUSPENDED") {
      console.log(`[Auth] Login failed: User ${email} is SUSPENDED`);
      return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    }

    const storedHashLength = user.password ? user.password.length : 0;
    console.log(`[Auth] Stored hash length for ${email}: ${storedHashLength}`);

    let isMatch = await bcrypt.compare(password, user.password);
    console.log(`[Auth] bcrypt.compare result for ${email}: ${isMatch}`);
    
    // Fallback for existing plain text passwords (pre-bcrypt)
    if (!isMatch && user.password === password) {
      isMatch = true;
      // Auto-upgrade password
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      });
      console.log(`[Auth] Auto-upgraded password hash for user: ${email}`);
    }

    console.log(`[Auth] Password match result for ${email}: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2FA enforcement check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      console.log(`[Auth] 2FA required for user: ${email}`);
      return res.json({
        require2FA: true,
        userId: user.id
      });
    }

    const payload = { userId: user.id, email: user.email, role: user.role, status: user.status };
    console.log(`[AUTH] JWT payload before signing: ${JSON.stringify(payload)}`);
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`[Auth] Token generated for user: ${email}`);
    console.log(`[AUTH] JWT role: ${user.role}`);

    // Record login history
    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || null;
    const userAgent = req.headers["user-agent"] || null;
    let device = "Desktop";
    if (userAgent) {
      if (/mobile/i.test(userAgent)) device = "Mobile";
      else if (/tablet/i.test(userAgent)) device = "Tablet";
    }
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        device
      }
    });

    await logAction(user.id, "USER_LOGIN", user.id, `User ${user.email} logged in successfully.`);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        plan: user.plan,
        licenseKey: user.licenseKey,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /auth/login/2fa
router.post("/login/2fa", async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ error: "UserId and token are required." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not set up for this user." });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid 2FA verification code." });
    }

    const payload = { userId: user.id, email: user.email, role: user.role, status: user.status };
    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    // Record login history
    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || null;
    const userAgent = req.headers["user-agent"] || null;
    let device = "Desktop";
    if (userAgent) {
      if (/mobile/i.test(userAgent)) device = "Mobile";
      else if (/tablet/i.test(userAgent)) device = "Tablet";
    }
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        device
      }
    });

    await logAction(user.id, "USER_LOGIN_2FA", user.id, `User ${user.email} completed 2FA login.`);

    res.json({
      message: "Login successful via 2FA",
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        plan: user.plan,
        licenseKey: user.licenseKey,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error("2FA login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /auth/2fa/setup
router.post("/2fa/setup", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const secret = generateSecret();
    const email = user.email;
    const otpauthUrl = `otpauth://totp/ByteForge:${email}?secret=${secret}&issuer=ByteForge`;

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    res.json({
      secret,
      qrCode: qrDataUrl,
      otpauthUrl
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "Failed to generate 2FA setup details." });
  }
});

// POST /auth/2fa/verify
router.post("/2fa/verify", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Verification token code is required." });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA setup has not been initiated." });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code. Please try again." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    await logAction(userId, "ENABLE_2FA", userId, `User enabled two-factor authentication.`);

    res.json({ success: true, message: "Two-factor authentication enabled successfully!" });
  } catch (error) {
    console.error("2FA verify error:", error);
    res.status(500).json({ error: "Failed to verify 2FA token." });
  }
});

// POST /auth/2fa/disable
router.post("/2fa/disable", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "TOTP token code is required to disable 2FA." });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA is not enabled." });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    await logAction(userId, "DISABLE_2FA", userId, `User disabled two-factor authentication.`);

    res.json({ success: true, message: "Two-factor authentication disabled successfully." });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ error: "Failed to disable 2FA." });
  }
});

// GET /auth/me
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log(`[AUTH] JWT payload after verification: ${JSON.stringify(decoded)}`);
    console.log(`[AUTH] JWT role: ${decoded.role}`);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        licenseKey: true,
        expiresAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`[AUTH] /auth/me role: ${user.role}`);
    console.log(`[AUTH] User status: ${user.status}`);

    if (user.status === "SUSPENDED") {
      return res.status(403).json({ error: "Your account is suspended." });
    }

    res.json({ user });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
