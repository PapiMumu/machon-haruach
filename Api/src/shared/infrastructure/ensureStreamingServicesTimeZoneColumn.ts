import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

/**
 * Adds streamingServices.timeZone (IANA id) for church-local schedule in admin and mobile.
 */
export async function ensureStreamingServicesTimeZoneColumn(): Promise<void> {
  try {
    const pool = await ConnectionManager.getPool("content");
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'streamingServices' AND COLUMN_NAME = 'timeZone'",
      []
    );
    const row = (rows as RowDataPacket[])[0] as { c: number };
    if (Number(row?.c) > 0) return;
    await pool.query(
      "ALTER TABLE `streamingServices` ADD COLUMN `timeZone` varchar(64) DEFAULT NULL AFTER `timezoneOffset`"
    );
    console.log("[content] Schema: added streamingServices.timeZone");
  } catch (e) {
    console.error("[content] Schema: could not ensure streamingServices.timeZone:", e);
  }
}
