import { getDbClient } from "@stockops/db";
import {
  generateTotpSecret,
  buildTotpUri,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  hashBackupCode,
} from "@stockops/core/totp";

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY ?? "stockops-dev-key-change-in-prod";

export class TwoFactorService {
  async setup(userId: string, email: string) {
    const secret = generateTotpSecret();
    const uri = buildTotpUri(secret, email);
    const encrypted = encryptSecret(secret, ENCRYPTION_KEY);

    const db = getDbClient();
    await db.totpSecret.upsert({
      where: { userId },
      create: { userId, encryptedSecret: encrypted, verified: false },
      update: { encryptedSecret: encrypted, verified: false },
    });

    return { secret, uri };
  }

  async verifySetup(userId: string, code: string): Promise<{ backupCodes: string[] } | null> {
    const db = getDbClient();
    const record = await db.totpSecret.findUnique({ where: { userId } });
    if (!record || record.verified) return null;

    const secret = decryptSecret(record.encryptedSecret, ENCRYPTION_KEY);
    if (!verifyTotpCode(secret, code)) return null;

    const backupCodes = generateBackupCodes();
    const hashedCodes = backupCodes.map((c) => ({
      userId,
      codeHash: hashBackupCode(c),
    }));

    await db.$transaction([
      db.totpSecret.update({ where: { userId }, data: { verified: true } }),
      db.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
      db.backupCode.deleteMany({ where: { userId } }),
      db.backupCode.createMany({ data: hashedCodes }),
    ]);

    return { backupCodes };
  }

  async validate(userId: string, code: string): Promise<boolean> {
    const db = getDbClient();
    const record = await db.totpSecret.findUnique({ where: { userId } });
    if (!record || !record.verified) return false;

    const secret = decryptSecret(record.encryptedSecret, ENCRYPTION_KEY);
    if (verifyTotpCode(secret, code)) return true;

    // Check backup codes
    const backupCode = await db.backupCode.findFirst({
      where: { userId, codeHash: hashBackupCode(code), usedAt: null },
    });
    if (backupCode) {
      await db.backupCode.update({
        where: { id: backupCode.id },
        data: { usedAt: new Date() },
      });
      return true;
    }

    return false;
  }

  async disable(userId: string) {
    const db = getDbClient();
    await db.$transaction([
      db.totpSecret.deleteMany({ where: { userId } }),
      db.backupCode.deleteMany({ where: { userId } }),
      db.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } }),
    ]);
  }

  async getBackupCodes(userId: string) {
    const db = getDbClient();
    const codes = await db.backupCode.findMany({
      where: { userId },
      select: { id: true, usedAt: true },
    });
    return codes.map((c) => ({ id: c.id, used: c.usedAt !== null }));
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const db = getDbClient();
    const backupCodes = generateBackupCodes();
    const hashedCodes = backupCodes.map((c) => ({
      userId,
      codeHash: hashBackupCode(c),
    }));

    await db.$transaction([
      db.backupCode.deleteMany({ where: { userId } }),
      db.backupCode.createMany({ data: hashedCodes }),
    ]);

    return backupCodes;
  }
}
