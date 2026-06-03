import { DateHelper } from "@machonharuach/apihelper";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { Playlist } from "../models/index.js";
import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";
import { injectable } from "inversify";

@injectable()
export class PlaylistRepo extends ConfiguredRepo<Playlist> {
  protected get repoConfig(): RepoConfig<Playlist> {
    return {
      tableName: "playlists",
      hasSoftDelete: false,
      columns: ["title", "description", "publishDate", "thumbnail", "playlistType", "mediaCategory", "sort"]
    };
  }

  // Override to use TypedDB instead of DB
  protected async create(model: Playlist): Promise<Playlist> {
    const m: any = model as any;
    if (!m[this.idColumn]) m[this.idColumn] = this.createId();
    if (m.sort == null) m.sort = 0;
    if (!m.mediaCategory) m.mediaCategory = "sermon";
    if (!m.playlistType) m.playlistType = "video";
    // Convert publishDate before insert
    if (m.publishDate) {
      m.publishDate = DateHelper.toMysqlDate(m.publishDate);
    }
    const { sql, params } = this.buildInsert(model);
    await TypedDB.query(sql, params);
    return model;
  }

  protected async update(model: Playlist): Promise<Playlist> {
    const m: any = model as any;
    if (m.sort == null) m.sort = 0;
    if (!m.mediaCategory) m.mediaCategory = "sermon";
    if (!m.playlistType) m.playlistType = "video";
    // Convert publishDate before update
    if (m.publishDate) {
      m.publishDate = DateHelper.toMysqlDate(m.publishDate);
    }
    const { sql, params } = this.buildUpdate(model);
    await TypedDB.query(sql, params);
    return model;
  }

  public async delete(churchId: string, id: string): Promise<any> {
    return TypedDB.query("DELETE FROM playlists WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public async load(churchId: string, id: string): Promise<Playlist> {
    return TypedDB.queryOne("SELECT * FROM playlists WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public loadById(id: string, churchId: string): Promise<Playlist> {
    return this.load(churchId, id);
  }

  private static readonly orderBySort =
    " ORDER BY COALESCE(p.sort, 999999) ASC, p.publishDate DESC, p.title ASC";

  public async loadAll(churchId: string): Promise<Playlist[]> {
    return TypedDB.query("SELECT * FROM playlists p WHERE p.churchId=?" + PlaylistRepo.orderBySort + ";", [churchId]);
  }

  public async updateSortOrder(churchId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await TypedDB.query("UPDATE playlists SET sort=? WHERE churchId=? AND id=?;", [i + 1, churchId, ids[i]]);
    }
  }

  public loadPublicAll(churchId: string, playlistType?: string): Promise<Playlist[]> {
    const typeFilter = playlistType === "music" || playlistType === "video" ? playlistType : null;
    const sql =
      "SELECT p.*," +
      " COALESCE(" +
      "   CASE WHEN COALESCE(p.playlistType, 'video') = 'music' THEN" +
      "     (SELECT COUNT(*) FROM playlistSongs ps WHERE ps.playlistId = p.id AND ps.churchId = p.churchId)" +
      "   ELSE" +
      "     (SELECT COUNT(*) FROM sermons s WHERE s.playlistId = p.id)" +
      "   END," +
      " 0) AS itemCount" +
      " FROM playlists p" +
      " WHERE p.churchId=?" +
      (typeFilter ? " AND COALESCE(p.playlistType, 'video') = ?" : "") +
      PlaylistRepo.orderBySort +
      ";";
    const params = typeFilter ? [churchId, typeFilter] : [churchId];
    return TypedDB.query(sql, params).then((rows: any[]) => rows.map((row) => this.rowToModel(row)));
  }

  protected rowToModel(row: any): Playlist {
    return {
      id: row.id,
      churchId: row.churchId,
      title: row.title,
      description: row.description,
      publishDate: row.publishDate,
      thumbnail: row.thumbnail,
      playlistType: row.playlistType || "video",
      mediaCategory: row.mediaCategory || "sermon",
      sort: row.sort != null ? Number(row.sort) : 0,
      itemCount: row.itemCount != null ? Number(row.itemCount) : undefined
    };
  }
}
