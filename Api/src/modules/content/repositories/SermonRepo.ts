import { DateHelper } from "@machonharuach/apihelper";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { Sermon } from "../models/index.js";
import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";
import { injectable } from "inversify";

@injectable()
export class SermonRepo extends ConfiguredRepo<Sermon> {
  protected get repoConfig(): RepoConfig<Sermon> {
    return {
      tableName: "sermons",
      hasSoftDelete: false,
      columns: [
        "playlistId", "mediaCategory", "videoType", "videoData", "videoUrl", "title", "description", "publishDate", "thumbnail", "duration", "permanentUrl", "sort"
      ]
    };
  }

  // Override to use TypedDB instead of DB
  protected async create(model: Sermon): Promise<Sermon> {
    const m: any = model as any;
    if (!m[this.idColumn]) m[this.idColumn] = this.createId();
    if (!m.mediaCategory) m.mediaCategory = "sermon";
    if (m.sort == null) m.sort = 0;
    if (m.permanentUrl == null) m.permanentUrl = false;
    // Convert publishDate before insert
    if (m.publishDate) {
      m.publishDate = DateHelper.toMysqlDate(m.publishDate);
    }
    const { sql, params } = this.buildInsert(model);
    await TypedDB.query(sql, params);
    return model;
  }

  protected async update(model: Sermon): Promise<Sermon> {
    const m: any = model as any;
    if (!m.mediaCategory) m.mediaCategory = "sermon";
    if (m.sort == null) m.sort = 0;
    if (m.permanentUrl == null) m.permanentUrl = false;
    // Convert publishDate before update
    if (m.publishDate) {
      m.publishDate = DateHelper.toMysqlDate(m.publishDate);
    }
    const { sql, params } = this.buildUpdate(model);
    await TypedDB.query(sql, params);
    return model;
  }

  public async delete(churchId: string, id: string): Promise<any> {
    return TypedDB.query("DELETE FROM sermons WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public async load(churchId: string, id: string): Promise<Sermon> {
    return TypedDB.queryOne("SELECT * FROM sermons WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public loadById(id: string, churchId: string): Promise<Sermon> {
    return this.load(churchId, id);
  }

  private static readonly orderBySort =
    " ORDER BY COALESCE(sort, 999999) ASC, publishDate DESC, title ASC;";

  public async loadAll(churchId: string): Promise<Sermon[]> {
    return TypedDB.query("SELECT * FROM sermons WHERE churchId=?" + SermonRepo.orderBySort, [churchId]);
  }

  public loadPublicAll(churchId: string): Promise<Sermon[]> {
    return TypedDB.query("SELECT * FROM sermons WHERE churchId=?" + SermonRepo.orderBySort, [churchId]);
  }

  public async updateSortOrder(churchId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await TypedDB.query("UPDATE sermons SET sort=? WHERE churchId=? AND id=?;", [i + 1, churchId, ids[i]]);
    }
  }

  public async loadTimeline(sermonIds: string[]) {
    const sql = "select 'sermon' as postType, id as postId, title, description, thumbnail" + " from sermons" + " where id in (?)";

    const params = [sermonIds];
    const result = await TypedDB.query(sql, params);
    return result;
  }

  protected rowToModel(row: any): Sermon {
    return {
      id: row.id,
      churchId: row.churchId,
      playlistId: row.playlistId,
      mediaCategory: row.mediaCategory || "sermon",
      videoType: row.videoType,
      videoData: row.videoData,
      videoUrl: row.videoUrl,
      title: row.title,
      description: row.description,
      publishDate: row.publishDate,
      thumbnail: row.thumbnail,
      duration: row.duration,
      permanentUrl: row.permanentUrl,
      sort: row.sort != null ? Number(row.sort) : 0
    };
  }
}
