import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_encryption_key_derivation_32bytes_long";

// Ensure key is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    return crypto.createHash("sha256").update(envKey).digest();
  }
  // Fallback derived key
  return crypto.createHash("sha256").update(JWT_SECRET).digest();
};

export const encrypt = (text: string): string => {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decrypt = (text: string): string => {
  if (!text) return "";
  try {
    const parts = text.split(":");
    if (parts.length !== 2) return text; // Maybe it's already plain text (e.g. from environment variable or not encrypted yet)
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encryptedText).toString("utf8");
    decrypted += decipher.final().toString("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Crypto] Decryption failed, returning input text:", error);
    return text; // Return text as fallback
  }
};
