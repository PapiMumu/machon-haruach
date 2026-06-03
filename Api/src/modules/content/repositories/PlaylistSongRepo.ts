import { injectable } from "inversify";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { UniqueIdHelper } from "@machonharuach/apihelper";
import { PlaylistSong } from "../models/PlaylistSong.js";

@injectable()
export class PlaylistSongRepo {
  public async deleteForPlaylist(churchId: string, playlistId: string) {
    return TypedDB.query("DELETE FROM playlistSongs WHERE churchId=? AND playlistId=?;", [churchId, playlistId]);
  }

  public async loadForPlaylist(churchId: string, playlistId: string): Promise<PlaylistSong[]> {
    const rows = await TypedDB.query(
      "SELECT * FROM playlistSongs WHERE churchId=? AND playlistId=? ORDER BY sort, id;",
      [churchId, playlistId]
    );
    return (rows as any[]).map((row) => this.rowToModel(row));
  }

  public async replaceForPlaylist(churchId: string, playlistId: string, songDetailIds: string[]) {
    await this.deleteForPlaylist(churchId, playlistId);
    let sort = 0;
    for (const songDetailId of songDetailIds) {
      if (!songDetailId?.trim()) continue;
      const model: PlaylistSong = {
        id: UniqueIdHelper.shortId(),
        churchId,
        playlistId,
        songDetailId,
        sort: sort++
      };
      await TypedDB.query(
        "INSERT INTO playlistSongs (id, churchId, playlistId, songDetailId, sort) VALUES (?, ?, ?, ?, ?);",
        [model.id, model.churchId, model.playlistId, model.songDetailId, model.sort]
      );
    }
  }

  /** Tracks in a music playlist for mobile/public, with hosted audio when available. */
  public loadPublicForPlaylist(churchId: string, playlistId: string) {
    return TypedDB.query(
      "SELECT sd.*, s.id as songId, ps.sort," +
        " (SELECT url FROM songDetailLinks WHERE songDetailId=sd.id AND service='Hosted' LIMIT 1) as audioUrl," +
        " (SELECT a.lyrics FROM arrangements a WHERE a.songDetailId=sd.id AND a.churchId=s.churchId" +
        " AND a.lyrics IS NOT NULL AND TRIM(a.lyrics) <> '' ORDER BY a.name LIMIT 1) as lyrics" +
        " FROM playlistSongs ps" +
        " INNER JOIN songDetails sd ON sd.id = ps.songDetailId" +
        " INNER JOIN arrangements a ON a.songDetailId = sd.id" +
        " INNER JOIN songs s ON s.id = a.songId" +
        " WHERE ps.churchId=? AND ps.playlistId=? AND s.churchId=?" +
        " ORDER BY ps.sort, sd.title;",
      [churchId, playlistId, churchId]
    );
  }

  public countForPlaylist(churchId: string, playlistId: string): Promise<number> {
    return TypedDB.queryOne(
      "SELECT COUNT(*) as c FROM playlistSongs WHERE churchId=? AND playlistId=?;",
      [churchId, playlistId]
    ).then((row: any) => Number(row?.c ?? 0));
  }

  private rowToModel(row: any): PlaylistSong {
    return {
      id: row.id,
      churchId: row.churchId,
      playlistId: row.playlistId,
      songDetailId: row.songDetailId,
      sort: Number(row.sort ?? 0)
    };
  }
}
