import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION = "v1";

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param text The plaintext to encrypt
 * @param keyHex 64-character hex string (32 bytes)
 * @returns Format: `v1:ivHex:authTagHex:ciphertextHex`
 */
export function encryptToken(text: string, keyHex: string): string {
  if (!text) return text;
  
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (64 hex characters).");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a token encrypted by `encryptToken`.
 * @param encryptedText Format: `v1:ivHex:authTagHex:ciphertextHex`
 * @param keyHex 64-character hex string (32 bytes)
 * @returns The decrypted plaintext
 */
export function decryptToken(encryptedText: string, keyHex: string): string {
  if (!encryptedText) return encryptedText;

  const parts = encryptedText.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted token format. Expected v1:iv:authTag:ciphertext.");
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts;

  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (64 hex characters).");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt token. Key may be invalid or payload tampered.");
  }
}
