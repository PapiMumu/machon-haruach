import { injectable } from "inversify";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { SongDetail } from "../models/index.js";
import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";
import { UniqueIdHelper } from "@machonharuach/apihelper";

const BASE_COLUMNS = [
  "praiseChartsId",
  "title",
  "artist",
  "album",
  "language",
  "thumbnail",
  "releaseDate",
  "bpm",
  "keySignature",
  "seconds",
  "meter",
  "tones"
] as const;

/** Added after initial schema; omitted from SQL when the column is not migrated yet. */
const OPTIONAL_COLUMNS = [
  "trackNumber",
  "featuredArtists",
  "producer",
  "composer",
  "lyricist",
  "genre",
  "recordLabel"
] as const;

type PersistColumn = (typeof BASE_COLUMNS)[number] | (typeof OPTIONAL_COLUMNS)[number];

let tableColumns: Set<string> | null = null;

async function getTableColumns(): Promise<Set<string>> {
  if (tableColumns) return tableColumns;
  const rows = (await TypedDB.query("SHOW COLUMNS FROM songDetails", [])) as { Field: string }[];
  tableColumns = new Set(rows.map((r) => r.Field));
  return tableColumns;
}

function persistColumns(cols: Set<string>): PersistColumn[] {
  return [
    ...BASE_COLUMNS.filter((c) => cols.has(c)),
    ...OPTIONAL_COLUMNS.filter((c) => cols.has(c))
  ];
}

function columnValue(songDetail: SongDetail, column: PersistColumn): unknown {
  if (column === "trackNumber") return songDetail.trackNumber ?? null;
  return (songDetail as Record<string, unknown>)[column] ?? null;
}

@injectable()
export class SongDetailRepo extends ConfiguredRepo<SongDetail> {
  protected churchIdColumn = "";

  protected get repoConfig(): RepoConfig<SongDetail> {
    return {
      tableName: "songDetails",
      hasSoftDelete: false,
      columns: [
        "praiseChartsId", "title", "artist", "album", "trackNumber", "language", "thumbnail", "releaseDate", "bpm", "keySignature", "seconds", "meter", "tones",
        "featuredArtists", "producer", "composer", "lyricist", "genre", "recordLabel"
      ]
    };
  }

  // SongDetails is a global table (no churchId), so override standard methods
  public async delete(_churchId: string, id: string): Promise<any> {
    return TypedDB.query("DELETE FROM songDetails WHERE id=?;", [id]);
  }

  public async load(_churchId: string, id: string): Promise<SongDetail> {
    return TypedDB.queryOne("SELECT * FROM songDetails WHERE id=?;", [id]);
  }

  public async loadAll(_churchId: string): Promise<SongDetail[]> {
    return TypedDB.query("SELECT * FROM songDetails ORDER BY title, artist;", []);
  }

  // Global methods without churchId (for global song details)
  public async loadGlobal(id: string) {
    const row = await TypedDB.queryOne("SELECT * FROM songDetails WHERE id=?;", [id]);
    return row ? this.rowToModel(row) : null;
  }

  public deleteGlobal(id: string) {
    return TypedDB.query("DELETE FROM songDetails WHERE id=?;", [id]);
  }

  public search(query: string) {
    const q = "%" + query.replace(/ /g, "%") + "%";
    return TypedDB.query("SELECT * FROM songDetails where title + ' ' + artist like ? or artist + ' ' + title like ?;", [q, q]);
  }

  public loadByPraiseChartsId(praiseChartsId: string) {
    return TypedDB.queryOne("SELECT * FROM songDetails where praiseChartsId=?;", [praiseChartsId]);
  }

  private static libraryOrder(cols: Set<string>) {
    const trackOrder = cols.has("trackNumber")
      ? "COALESCE(sd.trackNumber, 999), "
      : "";
    return `ORDER BY COALESCE(s.sort, 999999) ASC, ${trackOrder}sd.title ASC`;
  }

  public async loadForChurch(churchId: string) {
    const cols = await getTableColumns();
    const sql =
      "SELECT sd.*, s.id as songId, s.churchId, s.sort as songSort" +
      " FROM songs s" +
      " INNER JOIN arrangements a on a.songId=s.id" +
      " INNER JOIN songDetails sd on sd.id=a.songDetailId" +
      " WHERE s.churchId=?" +
      " " +
      SongDetailRepo.libraryOrder(cols) +
      ";";
    return TypedDB.query(sql, [churchId]);
  }

  /** Church song library for public/mobile clients, including hosted audio URL when present. */
  public async loadPublicForChurch(churchId: string) {
    const cols = await getTableColumns();
    const sql =
      "SELECT sd.*, s.id as songId, s.churchId, s.sort as songSort," +
      " (SELECT url FROM songDetailLinks WHERE songDetailId=sd.id AND service='Hosted' LIMIT 1) as audioUrl," +
      " (SELECT a.lyrics FROM arrangements a WHERE a.songDetailId=sd.id AND a.churchId=s.churchId" +
      " AND a.lyrics IS NOT NULL AND TRIM(a.lyrics) <> '' ORDER BY a.name LIMIT 1) as lyrics" +
      " FROM songs s" +
      " INNER JOIN arrangements a on a.songId=s.id" +
      " INNER JOIN songDetails sd on sd.id=a.songDetailId" +
      " WHERE s.churchId=?" +
      " " +
      SongDetailRepo.libraryOrder(cols) +
      ";";
    return TypedDB.query(sql, [churchId]);
  }

  public async loadAlbumTracksForChurch(churchId: string, album: string, artist: string) {
    const cols = await getTableColumns();
    const order = cols.has("trackNumber")
      ? "ORDER BY COALESCE(sd.trackNumber, 999), sd.title"
      : "ORDER BY sd.title";
    const sql =
      "SELECT sd.*, s.id as songId, s.churchId" +
      " FROM songs s" +
      " INNER JOIN arrangements a on a.songId=s.id" +
      " INNER JOIN songDetails sd on sd.id=a.songDetailId" +
      " WHERE s.churchId=?" +
      " AND LOWER(TRIM(IFNULL(sd.album, ''))) = LOWER(TRIM(?))" +
      " AND LOWER(TRIM(IFNULL(sd.artist, ''))) = LOWER(TRIM(?))" +
      " " +
      order +
      ";";
    return TypedDB.query(sql, [churchId, album, artist]);
  }

  protected async create(songDetail: SongDetail) {
    songDetail.id = UniqueIdHelper.shortId();
    const cols = await getTableColumns();
    const fields = persistColumns(cols);
    const insertCols = ["id", ...fields];
    const placeholders = insertCols.map(() => "?").join(", ");
    const sql = `INSERT INTO songDetails (${insertCols.join(", ")}) VALUES (${placeholders});`;
    const params = insertCols.map((col) => (col === "id" ? songDetail.id : columnValue(songDetail, col as PersistColumn)));
    await TypedDB.query(sql, params);
    return this.loadGlobal(songDetail.id!) as Promise<SongDetail>;
  }

  protected async update(songDetail: SongDetail) {
    const cols = await getTableColumns();
    const fields = persistColumns(cols);
    const assignments = fields.map((c) => `${c}=?`).join(", ");
    const sql = `UPDATE songDetails SET ${assignments} WHERE id=?`;
    const params = [...fields.map((col) => columnValue(songDetail, col)), songDetail.id];
    await TypedDB.query(sql, params);
    return this.loadGlobal(songDetail.id!) as Promise<SongDetail>;
  }

  public save(songDetail: SongDetail) {
    return songDetail.id ? this.update(songDetail) : this.create(songDetail);
  }

  protected rowToModel(row: any): SongDetail {
    return {
      id: row.id,
      praiseChartsId: row.praiseChartsId,
      title: row.title,
      artist: row.artist,
      album: row.album,
      trackNumber: row.trackNumber != null ? Number(row.trackNumber) : undefined,
      language: row.language,
      thumbnail: row.thumbnail,
      releaseDate: row.releaseDate,
      bpm: row.bpm,
      keySignature: row.keySignature,
      seconds: row.seconds,
      meter: row.meter,
      tones: row.tones,
      featuredArtists: row.featuredArtists,
      producer: row.producer,
      composer: row.composer,
      lyricist: row.lyricist,
      genre: row.genre,
      recordLabel: row.recordLabel
    };
  }
}
