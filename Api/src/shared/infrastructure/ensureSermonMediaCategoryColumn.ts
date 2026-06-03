import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

/**
 * Ensures sermons.mediaCategory exists for classifying video library content.
 * Runs at API startup so existing databases self-heal without manual migration.
 */
export async function ensureSermonMediaCategoryColumn(): Promise<void> {
  try {
    const pool = await ConnectionManager.getPool("content");
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sermons' AND COLUMN_NAME = 'mediaCategory'",
      []
    );
    const row = (rows as RowDataPacket[])[0] as { c: number };
    if (Number(row?.c) > 0) return;

    await pool.query(
      "ALTER TABLE `sermons` ADD COLUMN `mediaCategory` varchar(45) DEFAULT 'sermon' AFTER `playlistId`"
    );
    console.log("[content] Schema: added sermons.mediaCategory");
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column")) return;
    throw e;
  }
}
