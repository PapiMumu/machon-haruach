import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

async function ensureColumn(columnName: string, alterSql: string): Promise<void> {
  const pool = await ConnectionManager.getPool("membership");
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?",
    [columnName]
  );
  const row = (rows as RowDataPacket[])[0] as { c: number };
  if (Number(row?.c) > 0) return;
  await pool.query(alterSql);
  console.log(`[membership] Schema: added users.${columnName}`);
}

/**
 * Ensures billing/trial columns exist on membership users table.
 * Runs at startup so old databases self-heal.
 */
export async function ensureMembershipUserBillingColumns(): Promise<void> {
  try {
    await ensureColumn("subscriptionStatus", "ALTER TABLE `users` ADD COLUMN `subscriptionStatus` varchar(30) NOT NULL DEFAULT 'active' AFTER `lastName`");
    await ensureColumn("trialEndsAt", "ALTER TABLE `users` ADD COLUMN `trialEndsAt` datetime DEFAULT NULL AFTER `subscriptionStatus`");
    await ensureColumn("subscriptionEndsAt", "ALTER TABLE `users` ADD COLUMN `subscriptionEndsAt` datetime DEFAULT NULL AFTER `trialEndsAt`");
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column")) return;
    console.error("[membership] Schema: could not ensure users billing columns:", e);
  }
}
