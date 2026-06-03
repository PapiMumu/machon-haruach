import type { RowDataPacket } from "mysql2/promise";
import { ConnectionManager } from "./ConnectionManager.js";

/**
 * Ensures playlists.playlistType and playlistSongs exist for music vs video playlists.
 */
export async function ensurePlaylistMusicSchema(): Promise<void> {
  const pool = await ConnectionManager.getPool("content");

  try {
    const [colRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'playlists' AND COLUMN_NAME = 'playlistType'",
      []
    );
    const colCount = Number((colRows[0] as { c: number })?.c ?? 0);
    if (colCount === 0) {
      await pool.query(
        "ALTER TABLE `playlists` ADD COLUMN `playlistType` varchar(16) NOT NULL DEFAULT 'video' AFTER `thumbnail`"
      );
      console.log("[content] Schema: added playlists.playlistType");
    }
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (!(err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column"))) throw e;
  }

  try {
    const [catRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'playlists' AND COLUMN_NAME = 'mediaCategory'",
      []
    );
    const catCount = Number((catRows[0] as { c: number })?.c ?? 0);
    if (catCount === 0) {
      await pool.query(
        "ALTER TABLE `playlists` ADD COLUMN `mediaCategory` varchar(32) NOT NULL DEFAULT 'sermon' AFTER `playlistType`"
      );
      console.log("[content] Schema: added playlists.mediaCategory");
    }
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string; message?: string };
    const msg = String(err?.message ?? e);
    if (!(err?.errno === 1060 || err?.code === "ER_DUP_FIELDNAME" || msg.includes("Duplicate column"))) throw e;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlistSongs (
      id char(11) NOT NULL,
      churchId char(11) NOT NULL,
      playlistId char(11) NOT NULL,
      songDetailId char(11) NOT NULL,
      sort int NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_playlistSongs_playlist (playlistId),
      KEY idx_playlistSongs_church (churchId),
      UNIQUE KEY uk_playlistSongs_playlist_song (playlistId, songDetailId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
