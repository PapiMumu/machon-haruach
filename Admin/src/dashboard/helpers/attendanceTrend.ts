import { ApiHelper } from "@machonharuach/apphelper";

export interface AttendanceTrendRow {
  week?: string;
  visits?: number;
}

function normalizeRow(row: Record<string, unknown>): AttendanceTrendRow {
  return {
    week: (row.week ?? row.Week) as string | undefined,
    visits: Number(row.visits ?? row.Visits ?? 0)
  };
}

/** AttendanceApi base URL already ends with `/attendance` — path must not repeat it. */
export async function fetchAttendanceTrend(): Promise<AttendanceTrendRow[]> {
  const data = await ApiHelper.get(
    "/attendancerecords/trend?campusId=0&serviceId=0&serviceTimeId=0&groupId=0",
    "AttendanceApi"
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => normalizeRow(r as Record<string, unknown>));
}

export function filterAttendanceTrendByRange(
  rows: AttendanceTrendRow[],
  startDate: string,
  endDate: string
): AttendanceTrendRow[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return rows.filter((r) => {
    if (!r.week) return false;
    const d = new Date(r.week);
    if (Number.isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  });
}
