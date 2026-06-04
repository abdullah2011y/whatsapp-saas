import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// POST /auth/signup
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password } = req.body;
    
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
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`[Auth] Token generated for new user: ${email}`);

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: user.id, name: user.name, email: user.email }
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

    let isMatch = await bcrypt.compare(password, user.password);
    
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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`[Auth] Token generated for user: ${email}`);

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
