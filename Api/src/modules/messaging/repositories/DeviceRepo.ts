import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { Device } from "../models/index.js";

import { ConfiguredRepo, RepoConfig } from "../../../shared/infrastructure/ConfiguredRepo.js";

export class DeviceRepo extends ConfiguredRepo<Device> {
  // Override churchIdColumn to undefined since devices can exist without a church (anonymous pairing)
  protected churchIdColumn: string = undefined;
  private supportsContentColumns = true;

  protected get repoConfig(): RepoConfig<Device> {
    const coreColumns = [
      "appName", "deviceId", "churchId", "personId", "fcmToken", "label", "registrationDate", "lastActiveDate", "deviceInfo", "admId", "pairingCode", "ipAddress"
    ];
    const contentColumns = this.supportsContentColumns ? ["contentType", "contentId"] : [];
    return {
      tableName: "devices",
      hasSoftDelete: false,
      insertColumns: [...coreColumns, ...contentColumns],
      updateColumns: [
        "appName", "deviceId", "churchId", "personId", "fcmToken", "label", "lastActiveDate", "deviceInfo", "admId", "pairingCode", "ipAddress", ...contentColumns
      ]
    };
  }

  public async save(device: Device) {
    try {
      return await super.save(device);
    } catch (err: any) {
      const msg = String(err?.message || err || "").toLowerCase();
      const missingContentColumn = msg.includes("unknown column 'contenttype'") || msg.includes("unknown column 'contentid'");
      if (!missingContentColumn || !this.supportsContentColumns) throw err;

      // Backward-compatibility for environments where devices table has not yet been migrated.
      this.supportsContentColumns = false;
      device.contentType = undefined;
      device.contentId = undefined;
      return await super.save(device);
    }
  }

  public loadByIds(churchId: string, ids: string[]) {
    return TypedDB.query("SELECT * FROM devices WHERE churchId=? AND id IN (?)", [churchId, ids]);
  }

  public loadByPersonId(churchId: string, personId: string) {
    return TypedDB.query("SELECT * FROM devices WHERE churchId=? AND personId=?", [churchId, personId]);
  }

  public loadById(churchId: string, id: string) {
    return TypedDB.queryOne("SELECT * FROM devices WHERE id=? and churchId=?;", [id, churchId]);
  }

  public async loadByPairingCode(pairingCode: string) {
    return TypedDB.queryOne("SELECT * FROM devices WHERE pairingCode=?;", [pairingCode]);
  }

  public loadByDeviceId(deviceId: string) {
    return TypedDB.queryOne("SELECT * FROM devices WHERE deviceId=?;", [deviceId]);
  }

  public loadByFcmToken(churchId: string, fcmToken: string) {
    return TypedDB.queryOne("SELECT * FROM devices WHERE fcmToken=? and churchId=?;", [fcmToken, churchId]);
  }

  public loadByChurchId(churchId: string) {
    return TypedDB.query("SELECT * FROM devices WHERE churchId=? ORDER BY lastActiveDate desc", [churchId]);
  }

  public loadForPerson(churchId: string, personId: string) {
    return TypedDB.query("SELECT * FROM devices WHERE churchId=? AND personId=?", [churchId, personId]);
  }

  public deleteByFcmToken(fcmToken: string) {
    return TypedDB.query("DELETE FROM devices WHERE fcmToken=?", [fcmToken]);
  }

  protected rowToModel(row: any): Device {
    return {
      id: row.id,
      appName: row.appName,
      deviceId: row.deviceId,
      churchId: row.churchId,
      personId: row.personId,
      fcmToken: row.fcmToken,
      label: row.label,
      registrationDate: row.registrationDate,
      lastActiveDate: row.lastActiveDate,
      deviceInfo: row.deviceInfo,
      admId: row.admId,
      pairingCode: row.pairingCode,
      ipAddress: row.ipAddress,
      contentType: row.contentType,
      contentId: row.contentId
    };
  }
}
