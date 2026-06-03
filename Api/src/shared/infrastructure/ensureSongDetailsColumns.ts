import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

async function ensureColumn(columnName: string, alterSql: string): Promise<void> {
  const pool = await ConnectionManager.getPool("content");
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'songDetails' AND COLUMN_NAME = ?",
    [columnName]
  );
  const row = (rows as RowDataPacket[])[0] as { c: number };
  if (Number(row?.c) > 0) return;
  await pool.query(alterSql);
  console.log(`[content] Schema: added songDetails.${columnName}`);
}

/**
 * Ensures songDetails columns used by album uploads and credits metadata exist.
 * Runs at API startup so existing databases self-heal without manual migration.
 */
export async function ensureSongDetailsColumns(): Promise<void> {
  try {
    await ensureColumn(
      "trackNumber",
      "ALTER TABLE `songDetails` ADD COLUMN `trackNumber` int(11) DEFAULT NULL AFTER `album`"
    );
    await ensureColumn(
      "featuredArtists",
      "ALTER TABLE `songDetails` ADD COLUMN `featuredArtists` varchar(255) DEFAULT NULL AFTER `tones`"
    );
    await ensureColumn(
      "producer",
      "ALTER TABLE `songDetails` ADD COLUMN `producer` varchar(255) DEFAULT NULL AFTER `featuredArtists`"
    );
    await ensureColumn(
      "composer",
      "ALTER TABLE `songDetails` ADD COLUMN `composer` varchar(255) DEFAULT NULL AFTER `producer`"
    );
    await ensureColumn(
      "lyricist",
      "ALTER TABLE `songDetails` ADD COLUMN `lyricist` varchar(255) DEFAULT NULL AFTER `composer`"
    );
    await ensureColumn("genre", "ALTER TABLE `songDetails` ADD COLUMN `genre` varchar(100) DEFAULT NULL AFTER `lyricist`");
    await ensureColumn(
      "recordLabel",
      "ALTER TABLE `songDetails` ADD COLUMN `recordLabel` varchar(255) DEFAULT NULL AFTER `genre`"
    );
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column")) return;
    console.error("[content] Schema: could not ensure songDetails columns — song/album uploads may fail until ALTER is applied:", e);
  }
}
