import { injectable } from "inversify";
import { TypedDB } from "../../../shared/infrastructure/TypedDB.js";
import { ArrayHelper, DateHelper } from "@machonharuach/apihelper";
import { AttendanceRecord } from "../models/index.js";
import { BaseRepo } from "../../../shared/infrastructure/index.js";

@injectable()
export class AttendanceRepo extends BaseRepo<AttendanceRecord> {
  protected tableName = ""; // Not used - this repository doesn't map to a single table
  protected hasSoftDelete = false; // Not applicable for this analytics repository

  // This repository doesn't need standard CRUD operations
  protected async create(_model: AttendanceRecord): Promise<AttendanceRecord> {
    throw new Error("AttendanceRepo does not support create operations");
  }

  protected async update(_model: AttendanceRecord): Promise<AttendanceRecord> {
    throw new Error("AttendanceRepo does not support update operations");
  }
  public loadTree(churchId: string) {
    const sql =
      "SELECT c.id as campusId, IFNULL(c.name, 'Unassigned') as campusName, c.address1, c.address2, c.city, c.state, c.zip, c.country, c.phone, " +
      "s.id as serviceId, s.name as serviceName, st.id as serviceTimeId, st.name as serviceTimeName" +
      " FROM campuses c" +
      " LEFT JOIN services s on s.campusId = c.id AND IFNULL(s.removed, 0) = 0" +
      " LEFT JOIN serviceTimes st on st.serviceId = s.id AND IFNULL(st.removed, 0) = 0" +
      " WHERE(c.id is NULL or c.churchId = ?) AND IFNULL(c.removed, 0) = 0" +
      " ORDER by campusName, serviceName, serviceTimeName";
    const params = [churchId, churchId, churchId, churchId];
    return TypedDB.query(sql, params);
  }

  public loadTrend(churchId: string, campusId: string, serviceId: string, serviceTimeId: string, groupId: string) {
    const sql =
      "SELECT STR_TO_DATE(concat(year(v.visitDate), ' ', week(v.visitDate, 0), ' Sunday'), '%X %V %W') AS week, count(distinct(v.id)) as visits" +
      " FROM visits v" +
      " LEFT JOIN visitSessions vs on vs.visitId=v.id" +
      " LEFT JOIN sessions s on s.id = vs.sessionId" +
      " LEFT JOIN serviceTimes st on st.id = s.serviceTimeId" +
      " LEFT JOIN services ser on ser.id = st.serviceId" +
      " WHERE v.churchId=?" +
      " AND ? IN ('0', s.groupId)" +
      " AND ? IN ('0', st.id)" +
      " AND ? IN ('0', ser.id)" +
      " AND ? IN ('0', ser.campusId)" +
      " GROUP BY year(v.visitDate), week(v.visitDate, 0), STR_TO_DATE(concat(year(v.visitDate), ' ', week(v.visitDate, 0), ' Sunday'), '%X %V %W')" +
      " ORDER BY year(v.visitDate), week(v.visitDate, 0);";
    const params = [churchId, groupId, serviceTimeId, serviceId, campusId];
    return TypedDB.query(sql, params);
  }

  public loadGroups(churchId: string, serviceId: string, week: Date) {
    const sql =
      "SELECT ser.name as serviceName, st.name as serviceTimeName, s.groupId, v.personId" +
      " FROM visits v" +
      " INNER JOIN visitSessions vs on vs.churchId=v.churchId AND vs.visitId=v.id" +
      " INNER JOIN sessions s on s.id=vs.sessionId" +
      " INNER JOIN serviceTimes st on st.id=s.serviceTimeId" +
      " INNER JOIN services ser on ser.id=st.serviceId" +
      " WHERE v.churchId=?" +
      " AND ? IN (0, ser.id) " +
      " AND s.sessionDate BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)" +
      " ORDER by ser.name, st.name";
    const params = [churchId, serviceId, week, week];
    return TypedDB.query(sql, params);
  }

  protected rowToModel(data: any): AttendanceRecord {
    const result: AttendanceRecord = {
      visitDate: data.visitDate,
      checkinTime: data.checkinTime,
      week: data.week,
      count: data.count,
      groupId: data.groupId
    };
    if (data.campusId !== undefined || data.campusName !== undefined) {
      result.campus = {
        id: data.campusId,
        name: data.campusName,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        phone: data.phone
      };
    }
    if (data.serviceId !== null || data.serviceName !== null) result.service = { id: data.serviceId, name: data.serviceName, campusId: data.campusId };
    if (data.serviceTimeId !== null || data.serviceTimeName !== null) result.serviceTime = { id: data.serviceTimeId, name: data.serviceTimeName, serviceId: data.serviceId };
    return result;
  }

  // Override the base convertToModel to use rowToModel
  public convertToModel(_churchId: string, data: any): AttendanceRecord {
    return this.rowToModel(data);
  }

  // convertAllToModel is provided by BaseRepo using convertToModel

  public loadForPerson(churchId: string, personId: string) {
    const sql =
      "SELECT v.visitDate, v.checkinTime, c.id as campusId, c.name as campusName, ser.id as serviceId, ser.name as serviceName, st.id as serviceTimeId, st.name as serviceTimeName, s.groupId" +
      " FROM visits v" +
      " INNER JOIN visitSessions vs on vs.visitId = v.id" +
      " INNER JOIN sessions s on s.id = vs.sessionId" +
      " LEFT OUTER JOIN serviceTimes st on st.id = s.serviceTimeId" +
      " LEFT OUTER JOIN services ser on ser.Id = st.serviceId" +
      " LEFT OUTER JOIN campuses c on c.id = ser.campusId" +
      " WHERE v.churchId=? AND v.PersonId = ?" +
      " ORDER BY v.visitDate desc, c.name, ser.name, st.name";
    const params = [churchId, personId];
    return TypedDB.query(sql, params);
  }

  public loadByCampusId(churchId: string, campusId: string, startDate: Date, endDate: Date) {
    const sql =
      "SELECT v.*, c.id as campusId, c.name as campusName" +
      " FROM visits v" +
      " INNER JOIN services ser on ser.id = v.serviceId" +
      " INNER JOIN campuses c on c.id = ser.campusId" +
      " WHERE v.churchId=? AND ser.campusId=?" +
      " AND v.visitDate BETWEEN ? AND ?";
    const params = [churchId, campusId, DateHelper.toMysqlDate(startDate), DateHelper.toMysqlDate(endDate)];
    return TypedDB.query(sql, params);
  }

  public loadByServiceId(churchId: string, serviceId: string, startDate: Date, endDate: Date) {
    const sql =
      "SELECT v.*, ser.name as serviceName" + " FROM visits v" + " INNER JOIN services ser on ser.id = v.serviceId" + " WHERE v.churchId=? AND v.serviceId=?" + " AND v.visitDate BETWEEN ? AND ?";
    const params = [churchId, serviceId, DateHelper.toMysqlDate(startDate), DateHelper.toMysqlDate(endDate)];
    return TypedDB.query(sql, params);
  }

  public loadByServiceTimeId(churchId: string, serviceTimeId: string, startDate: Date, endDate: Date) {
    const sql =
      "SELECT v.*, st.name as serviceTimeName" +
      " FROM visits v" +
      " INNER JOIN visitSessions vs on vs.visitId = v.id" +
      " INNER JOIN sessions s on s.id = vs.sessionId" +
      " LEFT OUTER JOIN serviceTimes st on st.id = s.serviceTimeId" +
      " WHERE v.churchId=? AND st.id=?" +
      " AND v.visitDate BETWEEN ? AND ?";
    const params = [churchId, serviceTimeId, DateHelper.toMysqlDate(startDate), DateHelper.toMysqlDate(endDate)];
    return TypedDB.query(sql, params);
  }

  public loadByGroupId(churchId: string, groupId: string, startDate: Date, endDate: Date) {
    const sql =
      "SELECT v.*" +
      " FROM visits v" +
      " INNER JOIN visitSessions vs on vs.visitId = v.id" +
      " INNER JOIN sessions s on s.id = vs.sessionId" +
      " WHERE v.churchId=? AND s.groupId=?" +
      " AND v.visitDate BETWEEN ? AND ?";
    const params = [churchId, groupId, DateHelper.toMysqlDate(startDate), DateHelper.toMysqlDate(endDate)];
    return TypedDB.query(sql, params);
  }

  /** Visit counts in range grouped by person gender (membership people). */
  public async loadAttendanceByGender(churchId: string, startDate: Date, endDate: Date) {
    const visitSql =
      "SELECT v.personId, COUNT(DISTINCT v.id) AS visits" +
      " FROM visits v" +
      " WHERE v.churchId=?" +
      " AND v.visitDate BETWEEN ? AND ?" +
      " GROUP BY v.personId";
    const visitParams = [churchId, DateHelper.toMysqlDateOnly(startDate), DateHelper.toMysqlDateOnly(endDate)];
    const visitRows: { personId: string; visits: number }[] = (await TypedDB.query(visitSql, visitParams)) as any[];
    if (!visitRows.length) return [];

    const personIds = visitRows.map((r) => r.personId).filter(Boolean);
    const placeholders = ArrayHelper.fillArray("?", personIds.length).join(", ");
    const peopleSql =
      `SELECT id, gender FROM people WHERE churchId=? AND removed=0 AND id IN (${placeholders})`;
    const peopleRows: { id: string; gender: string }[] = (await TypedDB.queryModule(
      "membership",
      peopleSql,
      [churchId, ...personIds]
    )) as any[];

    const genderByPerson = new Map<string, string>();
    peopleRows.forEach((p) => genderByPerson.set(p.id, p.gender));

    const totals = new Map<string, number>();
    const normalizeGender = (raw?: string) => {
      const g = (raw || "").trim();
      if (!g || g.toLowerCase() === "unspecified" || g.toLowerCase() === "unknown") return "Unspecified";
      if (g.toLowerCase() === "male") return "Male";
      if (g.toLowerCase() === "female") return "Female";
      return g;
    };

    visitRows.forEach((row) => {
      const gender = normalizeGender(genderByPerson.get(row.personId));
      totals.set(gender, (totals.get(gender) || 0) + Number(row.visits || 0));
    });

    return Array.from(totals.entries())
      .map(([gender, visits]) => ({ gender, visits }))
      .sort((a, b) => b.visits - a.visits);
  }
}
