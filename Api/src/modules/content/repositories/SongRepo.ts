import { injectable } from "inversify";
import { DateHelper } from "@machonharuach/apihelper";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { Song } from "../models/index.js";
import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";

@injectable()
export class SongRepo extends ConfiguredRepo<Song> {
  protected get repoConfig(): RepoConfig<Song> {
    return {
      tableName: "songs",
      hasSoftDelete: false,
      columns: ["name", "dateAdded", "sort"]
    };
  }

  protected async create(model: Song): Promise<Song> {
    const m: any = model as any;
    if (!m[this.idColumn]) m[this.idColumn] = this.createId();
    if (m.sort == null) m.sort = 0;
    if (!m.dateAdded) m.dateAdded = DateHelper.toMysqlDate(new Date());
    else m.dateAdded = DateHelper.toMysqlDate(m.dateAdded);
    const { sql, params } = this.buildInsert(model);
    await TypedDB.query(sql, params);
    return model;
  }

  protected async update(model: Song): Promise<Song> {
    const m: any = model as any;
    if (m.sort == null) m.sort = 0;
    if (m.dateAdded) m.dateAdded = DateHelper.toMysqlDate(m.dateAdded);
    const { sql, params } = this.buildUpdate(model);
    await TypedDB.query(sql, params);
    return model;
  }

  public async delete(churchId: string, id: string): Promise<any> {
    return TypedDB.query("DELETE FROM songs WHERE churchId=? AND id=?;", [churchId, id]);
  }

  public async loadAll(churchId: string): Promise<Song[]> {
    return TypedDB.query(
      "SELECT * FROM songs WHERE churchId=? ORDER BY COALESCE(sort, 999999) ASC, name;",
      [churchId]
    ).then((rows: any[]) => rows.map((row) => this.rowToModel(row)));
  }

  public async updateSortOrder(churchId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await TypedDB.query("UPDATE songs SET sort=? WHERE churchId=? AND id=?;", [i + 1, churchId, ids[i]]);
    }
  }

  /** Sets the same sort index for every song in each library row (album tracks share one position). */
  public async updateLibrarySort(churchId: string, entries: { songIds: string[] }[]): Promise<void> {
    for (let i = 0; i < entries.length; i++) {
      const sort = i + 1;
      for (const id of entries[i].songIds) {
        if (id) await TypedDB.query("UPDATE songs SET sort=? WHERE churchId=? AND id=?;", [sort, churchId, id]);
      }
    }
  }

  public async load(churchId: string, id: string): Promise<Song> {
    return TypedDB.queryOne("SELECT * FROM songs WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public search(churchId: string, query: string) {
    const q = "%" + query.replace(/ /g, "%") + "%";
    const sql =
      "SELECT sd.*, ak.id as arrangementKeyId, ak.keySignature as arrangementKeySignature, ak.shortDescription FROM songs s" +
      " INNER JOIN arrangements a on a.songId=s.id" +
      " INNER JOIN arrangementKeys ak on ak.arrangementId=a.id" +
      " INNER JOIN songDetails sd on sd.id=a.songDetailId" +
      " where s.churchId=? AND (concat(sd.title, ' ', sd.artist) like ? or concat(sd.artist, ' ', sd.title) like ?);";
    return TypedDB.query(sql, [churchId, q, q]);
  }

  protected rowToModel(row: any): Song {
    return {
      id: row.id,
      churchId: row.churchId,
      name: row.name,
      dateAdded: row.dateAdded,
      sort: row.sort != null ? Number(row.sort) : 0
    };
  }
}
