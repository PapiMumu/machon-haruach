import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

/**
 * Adds optional sort columns for admin-defined display order (Videos, Playlists, Songs).
 */
export async function ensureMediaSortSchema(): Promise<void> {
  const pool = await ConnectionManager.getPool("content");

  for (const table of ["sermons", "playlists", "songs"] as const) {
    try {
      const [colRows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'sort'",
        [table]
      );
      const colCount = Number((colRows[0] as { c: number })?.c ?? 0);
      if (colCount === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`sort\` int NOT NULL DEFAULT 0`);
        console.log(`[content] Schema: added ${table}.sort`);
      }
    } catch (e: unknown) {
      const err = e as { errno?: number; code?: string; message?: string };
      const msg = String(err?.message ?? e);
      if (!(err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column"))) throw e;
    }
  }
}
