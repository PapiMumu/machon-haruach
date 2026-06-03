import { injectable } from "inversify";
import { ConfiguredRepo, type RepoConfig } from "../../../shared/infrastructure/index.js";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { DateHelper } from "../../../shared/helpers/DateHelper.js";
import { DonationBatch } from "../models/index.js";

@injectable()
export class DonationBatchRepo extends ConfiguredRepo<DonationBatch> {
  /** null = not yet checked; avoids breaking giving when `branchName` migration has not been applied. */
  private branchNameColumnExists: boolean | null = null;

  protected get repoConfig(): RepoConfig<DonationBatch> {
    return {
      tableName: "donationBatches",
      hasSoftDelete: false,
      defaultOrderBy: "batchDate DESC",
      columns: ["name", "batchDate", "branchName"]
    };
  }

  private async hasBranchNameColumn(): Promise<boolean> {
    if (this.branchNameColumnExists !== null) return this.branchNameColumnExists;
    try {
      const rows = await TypedDB.query("SHOW COLUMNS FROM `donationBatches` LIKE 'branchName'", []);
      this.branchNameColumnExists = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.branchNameColumnExists = false;
    }
    return this.branchNameColumnExists;
  }

  /**
   * One batch per church + calendar day + payment channel + optional branch/campus (when `branchName` column exists).
   * Stored name is the gateway/method only (e.g. "EcoCash"); batchDate carries the day.
   * Legacy rows named `Online — {method} — {date}` still match.
   */
  public async getOrCreateForOnlineGift(
    churchId: string,
    donationDate: Date | string | null | undefined,
    methodLabel: string | null | undefined,
    campusOrBranch: string | null | undefined = null
  ): Promise<DonationBatch> {
    const dateStr = DateHelper.toMysqlDateOnly(donationDate) || DateHelper.today();
    const rawMethod = (methodLabel || "Online").toString().trim().replace(/\s+/g, " ");
    const methodSafe = (rawMethod || "Online").replace(/[\u2014\u2013]/g, "-").slice(0, 72);
    const shortName = methodSafe;
    const legacyName = `Online — ${methodSafe} — ${dateStr}`;
    const branchNorm = (campusOrBranch ?? "").toString().trim().slice(0, 128);
    const useBranch = await this.hasBranchNameColumn();

    let existing: any = null;
    if (useBranch) {
      existing = await TypedDB.queryOne(
        "SELECT * FROM donationBatches WHERE churchId=? AND batchDate=? AND name=? AND IFNULL(branchName,'')=? LIMIT 1;",
        [churchId, dateStr, shortName, branchNorm]
      );
      if (existing === null) {
        existing = await TypedDB.queryOne(
          "SELECT * FROM donationBatches WHERE churchId=? AND batchDate=? AND name=? AND IFNULL(branchName,'')=? LIMIT 1;",
          [churchId, dateStr, legacyName, branchNorm]
        );
      }
    } else {
      existing = await TypedDB.queryOne(
        "SELECT * FROM donationBatches WHERE churchId=? AND batchDate=? AND name=? LIMIT 1;",
        [churchId, dateStr, shortName]
      );
      if (existing === null) {
        existing = await TypedDB.queryOne(
          "SELECT * FROM donationBatches WHERE churchId=? AND batchDate=? AND name=? LIMIT 1;",
          [churchId, dateStr, legacyName]
        );
      }
    }

    if (existing !== null) return this.convertToModel(churchId, existing);

    const [y, m, d] = dateStr.split("-").map((part) => parseInt(part, 10));
    const batchDate = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? new Date(y, m - 1, d) : new Date();

    const batch: DonationBatch = {
      churchId,
      name: shortName,
      batchDate,
      branchName: useBranch && branchNorm.length > 0 ? branchNorm : null
    };
    await this.save(batch);
    return batch;
  }

  protected async create(batch: DonationBatch): Promise<DonationBatch> {
    const m: any = batch;
    if (!m.id) m.id = this.createId();
    const batchDate = DateHelper.toMysqlDateOnly(batch.batchDate); // date-only field
    const useBranch = await this.hasBranchNameColumn();
    if (useBranch) {
      const sql = "INSERT INTO donationBatches (id, churchId, name, batchDate, branchName) VALUES (?, ?, ?, ?, ?);";
      const params = [batch.id, batch.churchId, batch.name, batchDate, batch.branchName ?? null];
      await TypedDB.query(sql, params);
    } else {
      const sql = "INSERT INTO donationBatches (id, churchId, name, batchDate) VALUES (?, ?, ?, ?);";
      const params = [batch.id, batch.churchId, batch.name, batchDate];
      await TypedDB.query(sql, params);
    }
    return batch;
  }

  protected async update(batch: DonationBatch): Promise<DonationBatch> {
    const batchDate = DateHelper.toMysqlDateOnly(batch.batchDate); // date-only field
    const useBranch = await this.hasBranchNameColumn();
    if (useBranch) {
      const sql = "UPDATE donationBatches SET name=?, batchDate=?, branchName=? WHERE id=? and churchId=?";
      const params = [batch.name, batchDate, batch.branchName ?? null, batch.id, batch.churchId];
      await TypedDB.query(sql, params);
    } else {
      const sql = "UPDATE donationBatches SET name=?, batchDate=? WHERE id=? and churchId=?";
      const params = [batch.name, batchDate, batch.id, batch.churchId];
      await TypedDB.query(sql, params);
    }
    return batch;
  }

  public async loadAll(churchId: string) {
    // Same campus extraction as DonationRepo.loadFundTotals — derive branch for batches without `branchName` set.
    const campusFromNotesExpr =
      "CASE WHEN IFNULL(d.notes,'') LIKE '%givingCampus|%' THEN " +
      "TRIM(TRAILING CHAR(13) FROM TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(IFNULL(d.notes,''), CHAR(13), ''), 'givingCampus|', -1), CHAR(10), 1))) " +
      "ELSE '' END";
    const sql =
      "SELECT db.*, " +
      "IFNULL(d_agg.donationCount, 0) AS donationCount, " +
      "IFNULL(d_agg.totalAmount, 0) AS totalAmount, " +
      "NULLIF(TRIM(d_agg.branchFromNotes), '') AS branchFromNotes " +
      "FROM donationBatches db " +
      "LEFT JOIN (" +
      "  SELECT d.batchId, " +
      "  COUNT(*) AS donationCount, " +
      "  SUM(d.amount) AS totalAmount, " +
      "  GROUP_CONCAT(DISTINCT NULLIF(TRIM(" +
      campusFromNotesExpr +
      "), '') SEPARATOR ' · ') AS branchFromNotes " +
      "  FROM donations d " +
      "  WHERE d.churchId = ? " +
      "  GROUP BY d.batchId" +
      ") d_agg ON db.id = d_agg.batchId " +
      "WHERE db.churchId = ? " +
      "ORDER BY db.batchDate DESC";
    const result = await TypedDB.query(sql, [churchId, churchId]);
    return this.convertAllToModel(churchId, result);
  }

  protected rowToModel(data: any): DonationBatch {
    const rawBranchNotes = data.branchFromNotes ?? data.branchfromnotes ?? data.BranchFromNotes;
    const branchFromNotes =
      rawBranchNotes != null && String(rawBranchNotes).trim() !== "" ? String(rawBranchNotes).trim() : null;
    const result: DonationBatch = {
      id: data.id,
      name: data.name,
      batchDate: data.batchDate,
      branchName:
        data.branchName != null && String(data.branchName).trim() !== "" ? String(data.branchName).trim() : null,
      branchFromNotes,
      donationCount: data.donationCount,
      totalAmount: data.totalAmount
    };
    return result;
  }
}
