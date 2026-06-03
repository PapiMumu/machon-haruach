import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

/**
 * Ensures `people.country` exists (matches `tools/dbScripts/membership/people.sql`).
 * Runs at API startup so existing databases self-heal without separate migration files.
 * Requires DB user permission to ALTER TABLE on `people`.
 */
export async function ensureMembershipPeopleCountryColumn(): Promise<void> {
  try {
    const pool = await ConnectionManager.getPool("membership");
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'people' AND COLUMN_NAME = 'country'"
    );
    const row = (rows as RowDataPacket[])[0] as { c: number };
    if (Number(row?.c) > 0) return;

    await pool.query(
      "ALTER TABLE `people` ADD COLUMN `country` varchar(100) DEFAULT NULL AFTER `zip`"
    );
    console.log("[membership] Schema: added column people.country");
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column")) {
      return;
    }
    console.error(
      "[membership] Schema: could not ensure people.country — address saves may fail until ALTER is applied:",
      e
    );
  }
}
