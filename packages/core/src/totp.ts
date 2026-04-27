import crypto from "node:crypto";

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = "sha1";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

/** Generate a random base32 TOTP secret */
export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/** Generate a TOTP code for the current time */
export function generateTotpCode(secret: string, timeOffset = 0): string {
  const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeOffset;
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(time));

  const decodedSecret = base32Decode(secret);
  const hmac = crypto.createHmac(TOTP_ALGORITHM, decodedSecret);
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1]! & 0x0f;
  const code =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** Verify a TOTP code, allowing 1 period of drift */
export function verifyTotpCode(secret: string, code: string): boolean {
  for (let offset = -1; offset <= 1; offset++) {
    if (generateTotpCode(secret, offset) === code) {
      return true;
    }
  }
  return false;
}

/** Build an otpauth:// URI for QR code generation */
export function buildTotpUri(secret: string, email: string, issuer = "StockOps"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/** Encrypt a TOTP secret for storage */
export function encryptSecret(plaintext: string, key: string): string {
  const keyBuffer = crypto.scryptSync(key, "stockops-totp", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a stored TOTP secret */
export function decryptSecret(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Invalid ciphertext format");

  const keyBuffer = crypto.scryptSync(key, "stockops-totp", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(Buffer.from(encryptedHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}

/** Generate backup codes */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(BACKUP_CODE_LENGTH / 2);
    return bytes.toString("hex").toUpperCase();
  });
}

/** Hash a backup code for storage */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

// ── Base32 helpers ──

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
