import { ApiHelper } from "@machonharuach/apphelper";

export interface AttendanceGenderRow {
  gender?: string;
  visits?: number;
}

const GENDER_ORDER = ["Male", "Female", "Unspecified"] as const;

const GENDER_COLORS: Record<string, string> = {
  Male: "#5B8DEF",
  Female: "#F472B6",
  Unspecified: "#94A3B8"
};

function normalizeGenderKey(raw?: string): string {
  const g = (raw || "").trim();
  if (!g || g.toLowerCase() === "unspecified" || g.toLowerCase() === "unknown") return "Unspecified";
  if (g.toLowerCase() === "male") return "Male";
  if (g.toLowerCase() === "female") return "Female";
  return g;
}

function normalizeRow(row: Record<string, unknown>): AttendanceGenderRow {
  return {
    gender: normalizeGenderKey((row.gender ?? row.Gender) as string | undefined),
    visits: Number(row.visits ?? row.Visits ?? 0)
  };
}

export async function fetchAttendanceByGender(startDate: string, endDate: string): Promise<AttendanceGenderRow[]> {
  const data = await ApiHelper.get(
    `/attendancerecords/bygender?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    "AttendanceApi"
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => normalizeRow(r as Record<string, unknown>));
}

export function genderChartLabel(gender: string, labels: { male: string; female: string; unspecified: string }): string {
  if (gender === "Male") return labels.male;
  if (gender === "Female") return labels.female;
  if (gender === "Unspecified") return labels.unspecified;
  return gender;
}

export function buildAttendanceGenderBarData(
  rows: AttendanceGenderRow[],
  labelFor: (gender: string) => string
): { chartData: (string | number)[][]; colors: string[] } {
  if (!rows.length) return { chartData: [], colors: [] };

  const totals = new Map<string, number>();
  rows.forEach((r) => {
    const key = normalizeGenderKey(r.gender);
    totals.set(key, (totals.get(key) || 0) + Number(r.visits || 0));
  });

  const ordered = [
    ...GENDER_ORDER.filter((g) => totals.has(g)),
    ...[...totals.keys()].filter((g) => !GENDER_ORDER.includes(g as (typeof GENDER_ORDER)[number])).sort()
  ];

  return {
    chartData: [["Gender", "Visits"], ...ordered.map((g) => [labelFor(g), totals.get(g) || 0])],
    colors: ordered.map((g) => GENDER_COLORS[g] ?? "#818CF8")
  };
}
