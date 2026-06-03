import { ApiHelper } from "@machonharuach/apphelper";
import { toPreferredGivingLabel } from "../../donations/helpers/fundLabel";
import { loadGivingFundsCatalog } from "../../donations/helpers/loadGivingFunds";

export interface DonationFundTotalRow {
  fundName?: string;
  givingCampusFromNotes?: string;
  totalAmount?: number;
  entries?: number;
}

const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";
const UNASSIGNED_BRANCH = "Unassigned";

function asArray<T = unknown>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input) return [];
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    const candidate = o.data ?? o.items ?? o.results ?? o.rows;
    if (Array.isArray(candidate)) return candidate as T[];
    return Object.values(input) as T[];
  }
  return [];
}

function normalizeToken(value?: string): string {
  return String(value || "").trim().toLowerCase();
}

function parseCampusFromGivingNotes(notes?: string): string {
  const n = String(notes || "");
  const idx = n.indexOf(GIVING_CAMPUS_NOTE_PREFIX);
  if (idx === -1) return "";
  return (n.slice(idx + GIVING_CAMPUS_NOTE_PREFIX.length).split(/\r\n|\n|\r/)[0] ?? "").trim();
}

export function normalizeFundTotalApiRows(rawRows: unknown[]): DonationFundTotalRow[] {
  return asArray<Record<string, unknown>>(rawRows)
    .map((raw) => {
      const fundName = String(raw.fundName ?? raw.fundname ?? raw.FundName ?? "").trim();
      if (!fundName) return null;
      return {
        fundName,
        givingCampusFromNotes: String(raw.givingCampusFromNotes ?? raw.givingcampusfromnotes ?? "").trim(),
        totalAmount: Number(raw.totalAmount ?? raw.totalamount ?? 0),
        entries: Number(raw.entries ?? 0)
      };
    })
    .filter((r): r is DonationFundTotalRow => r != null);
}

function resolveCampusFromNotesTag(tag: string, campusNames: string[]): string {
  const t = normalizeToken(tag);
  if (!t) return "";
  const exact = campusNames.find((c) => normalizeToken(c) === t);
  if (exact) return exact;
  const partial = campusNames.find((c) => {
    const nc = normalizeToken(c);
    return nc && (t.includes(nc) || nc.includes(t));
  });
  return partial || String(tag || "").trim();
}

function resolveBranchFromFundName(rawFundName: string, campusNames: string[]): string {
  const normalizedFund = normalizeToken(rawFundName);
  if (!normalizedFund) return "";
  const match = campusNames.find((campus) => {
    const nc = normalizeToken(campus);
    return nc && normalizedFund.includes(nc);
  });
  return match || "";
}

function resolveBranchKeyForFundRow(row: DonationFundTotalRow, rawFundName: string, campusNames: string[]): string {
  const fromNotes = String(row.givingCampusFromNotes || "").trim();
  if (fromNotes) {
    const resolved = resolveCampusFromNotesTag(fromNotes, campusNames);
    if (campusNames.length === 0) return resolved;
    const match = campusNames.find((c) => normalizeToken(c) === normalizeToken(resolved));
    return match || resolved.trim();
  }
  return resolveBranchFromFundName(rawFundName, campusNames);
}

function resolveTargetBranches(parsedBranch: string, campusNames: string[]): string[] {
  if (parsedBranch) return [parsedBranch];
  if (campusNames.length === 1) return [campusNames[0]];
  return [UNASSIGNED_BRANCH];
}

function distributeAcrossBranches(totalAmount: number, entries: number, branches: string[]) {
  const safe = branches.length > 0 ? branches : [UNASSIGNED_BRANCH];
  const amountShare = totalAmount / safe.length;
  const entryShare = entries / safe.length;
  return safe.map((branch) => ({ branch, amountShare, entryShare }));
}

function resolveTypeFromFundName(rawFundName: string, campusNames: string[]): string {
  let candidate = String(rawFundName || "").trim();
  campusNames.forEach((campus) => {
    if (!campus) return;
    const re = new RegExp(campus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    candidate = candidate.replace(re, " ");
  });
  candidate = candidate.replace(/[-:@|]/g, " ").replace(/\s+/g, " ").trim();
  const forLabel = (candidate || rawFundName).trim();
  if (!forLabel) return rawFundName || "Unknown";
  const preferred = toPreferredGivingLabel(forLabel);
  if (preferred === "General" && normalizeToken(forLabel) !== "general") return forLabel;
  return preferred;
}

export async function fetchFundTotalsForRange(startDate: string, endDate: string): Promise<DonationFundTotalRow[]> {
  try {
    const rows = await ApiHelper.get(`/donations/fundTotals?startDate=${startDate}&endDate=${endDate}`, "GivingApi");
    const normalized = normalizeFundTotalApiRows(asArray(rows));
    if (normalized.length > 0) return normalized;
  } catch {
    /* fallback below */
  }

  try {
    const fundRows = await loadGivingFundsCatalog();
    const [donations, fundDonations] = await Promise.all([
      ApiHelper.get("/donations", "GivingApi"),
      ApiHelper.get("/funddonations", "GivingApi")
    ]);
    const donationRows = asArray<{ id?: string; donationDate?: string; date?: string; notes?: string; status?: string }>(donations);
    const fundDonationRows = asArray<{ donationId?: string; fundId?: string; amount?: number }>(fundDonations);
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59`);
    const eligible = new Set(
      donationRows
        .filter((d) => {
          const st = String(d?.status ?? "").trim().toLowerCase();
          if (st && st !== "complete") return false;
          const raw = d?.donationDate || d?.date;
          const dt = raw ? new Date(`${String(raw).slice(0, 10)}T12:00:00`) : null;
          return !!dt && !Number.isNaN(dt.getTime()) && dt >= rangeStart && dt <= rangeEnd;
        })
        .map((d) => String(d.id || ""))
        .filter(Boolean)
    );
    const notesById = new Map<string, string>();
    donationRows.forEach((d) => {
      const id = String(d.id || "");
      if (id && eligible.has(id)) notesById.set(id, String(d.notes ?? ""));
    });
    const fundNameById = new Map(
      asArray<{ id?: string; name?: string }>(fundRows)
        .map((f) => [String(f.id || "").trim(), String(f.name || "").trim()] as [string, string])
        .filter(([id]) => id.length > 0)
    );
    const byComposite = new Map<string, { fundName: string; campus: string; total: number; entries: number }>();
    fundDonationRows.forEach((fd) => {
      const donationId = String(fd.donationId || "");
      if (!eligible.has(donationId)) return;
      const fundId = String(fd.fundId || "").trim();
      const fundName = fundNameById.get(fundId) || toPreferredGivingLabel(fundId) || "Unknown fund";
      const campus = parseCampusFromGivingNotes(notesById.get(donationId));
      const key = `${fundName}\x1e${campus}`;
      const prev = byComposite.get(key) || { fundName, campus, total: 0, entries: 0 };
      byComposite.set(key, { fundName, campus, total: prev.total + Number(fd.amount || 0), entries: prev.entries + 1 });
    });
    return Array.from(byComposite.values()).map((v) => ({
      fundName: v.fundName,
      givingCampusFromNotes: v.campus,
      totalAmount: v.total,
      entries: v.entries
    }));
  } catch {
    return [];
  }
}

export function aggregateGivingByFund(rows: DonationFundTotalRow[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const label = resolveTypeFromFundName(String(row.fundName || ""), []);
    map.set(label, (map.get(label) || 0) + Number(row.totalAmount || 0));
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function aggregateGivingByBranch(rows: DonationFundTotalRow[], campusNames: string[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const rawFundName = String(row.fundName || "").trim();
    if (!rawFundName) return;
    const parsedBranch = resolveBranchKeyForFundRow(row, rawFundName, campusNames);
    const targets = resolveTargetBranches(parsedBranch, campusNames);
    distributeAcrossBranches(Number(row.totalAmount || 0), Number(row.entries || 0), targets).forEach((t) => {
      map.set(t.branch, (map.get(t.branch) || 0) + t.amountShare);
    });
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface TopBranchGivingResult {
  branch: string;
  total: number;
  topFundLabel: string;
  topFundAmount: number;
}

/** Branch with the highest total giving, plus that branch's largest fund (same rules as Giving by branch). */
export function getTopBranchWithGiving(
  rows: DonationFundTotalRow[],
  campusNames: string[]
): TopBranchGivingResult | null {
  const branchToFunds = new Map<string, Map<string, number>>();

  rows.forEach((row) => {
    const rawFundName = String(row.fundName || "").trim();
    if (!rawFundName) return;
    const parsedBranch = resolveBranchKeyForFundRow(row, rawFundName, campusNames);
    const typeLabel = resolveTypeFromFundName(rawFundName, campusNames);
    const rowTotal = Number(row.totalAmount || 0);
    const rowEntries = Number(row.entries || 0);
    const targets = resolveTargetBranches(parsedBranch, campusNames);
    distributeAcrossBranches(rowTotal, rowEntries, targets).forEach((t) => {
      const fundMap = branchToFunds.get(t.branch) || new Map<string, number>();
      fundMap.set(typeLabel, (fundMap.get(typeLabel) || 0) + t.amountShare);
      branchToFunds.set(t.branch, fundMap);
    });
  });

  let bestBranch = "";
  let bestTotal = -1;
  branchToFunds.forEach((fundMap, branch) => {
    const total = Array.from(fundMap.values()).reduce((s, v) => s + v, 0);
    if (total > bestTotal) {
      bestTotal = total;
      bestBranch = branch;
    } else if (total === bestTotal && total > 0 && branch.localeCompare(bestBranch) < 0) {
      bestBranch = branch;
    }
  });

  if (!bestBranch || bestTotal <= 0) return null;

  const fundMap = branchToFunds.get(bestBranch)!;
  let topFundLabel = "";
  let topFundAmount = -1;
  fundMap.forEach((amt, label) => {
    if (amt > topFundAmount) {
      topFundAmount = amt;
      topFundLabel = label;
    } else if (amt === topFundAmount && label.localeCompare(topFundLabel) < 0) {
      topFundLabel = label;
    }
  });

  if (topFundAmount <= 0) return { branch: bestBranch, total: bestTotal, topFundLabel: "", topFundAmount: 0 };

  return { branch: bestBranch, total: bestTotal, topFundLabel, topFundAmount };
}

export interface DonationSummaryWeekRow {
  week?: string;
  donations?: { fund?: { name?: string }; totalAmount?: number }[];
}

function weekStartFromDonationDate(raw: string): string {
  const dt = new Date(`${String(raw).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return "";
  const d = new Date(dt);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function summaryWeeksHaveGiving(weeks: DonationSummaryWeekRow[]): boolean {
  return weeks.some((w) => (w.donations || []).some((d) => Number(d.totalAmount || 0) > 0));
}

/** Build weekly per-fund totals from donations ledger (matches fundTotals when summary API is empty). */
async function buildGivingSummaryWeeksFromLedger(
  startDate: string,
  endDate: string
): Promise<DonationSummaryWeekRow[]> {
  try {
    const fundRows = await loadGivingFundsCatalog();
    const [donations, fundDonations] = await Promise.all([
      ApiHelper.get("/donations", "GivingApi"),
      ApiHelper.get("/funddonations", "GivingApi")
    ]);
    const donationRows = asArray<{ id?: string; donationDate?: string; date?: string; status?: string }>(donations);
    const fundDonationRows = asArray<{ donationId?: string; fundId?: string; amount?: number }>(fundDonations);
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59`);

    const dateByDonationId = new Map<string, string>();
    donationRows.forEach((d) => {
      const id = String(d.id || "");
      if (!id) return;
      const st = String(d?.status ?? "").trim().toLowerCase();
      if (st && st !== "complete") return;
      const raw = d.donationDate || d.date;
      if (!raw) return;
      const dt = new Date(`${String(raw).slice(0, 10)}T12:00:00`);
      if (Number.isNaN(dt.getTime()) || dt < rangeStart || dt > rangeEnd) return;
      dateByDonationId.set(id, String(raw).slice(0, 10));
    });

    const fundNameById = new Map(
      asArray<{ id?: string; name?: string }>(fundRows)
        .map((f) => [String(f.id || "").trim(), String(f.name || "").trim()] as [string, string])
        .filter(([id]) => id.length > 0)
    );

    const byWeek = new Map<string, Map<string, { fundName: string; total: number }>>();

    fundDonationRows.forEach((fd) => {
      const donationId = String(fd.donationId || "");
      const donationDate = dateByDonationId.get(donationId);
      if (!donationDate) return;

      const weekKey = weekStartFromDonationDate(donationDate);
      if (!weekKey) return;

      const fundId = String(fd.fundId || "").trim();
      const fundName = fundNameById.get(fundId) || toPreferredGivingLabel(fundId) || "Unknown fund";
      const amount = Number(fd.amount || 0);
      if (amount <= 0) return;

      const weekMap = byWeek.get(weekKey) || new Map<string, { fundName: string; total: number }>();
      const prev = weekMap.get(fundName) || { fundName, total: 0 };
      weekMap.set(fundName, { fundName, total: prev.total + amount });
      byWeek.set(weekKey, weekMap);
    });

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([week, fundMap]) => ({
        week,
        donations: Array.from(fundMap.values()).map((f) => ({
          fund: { name: f.fundName },
          totalAmount: f.total
        }))
      }));
  } catch {
    return [];
  }
}

export async function fetchGivingSummaryWeeks(
  startDate: string,
  endDate: string
): Promise<DonationSummaryWeekRow[]> {
  try {
    const summaryResp = await ApiHelper.get(`/donations/summary?startDate=${startDate}&endDate=${endDate}`, "GivingApi");
    const weeks = asArray<DonationSummaryWeekRow>(summaryResp).filter((w) => w.week);
    if (summaryWeeksHaveGiving(weeks)) return weeks;
  } catch {
    /* use ledger fallback */
  }

  return buildGivingSummaryWeeksFromLedger(startDate, endDate);
}

const MAX_FUNDS_ON_LINE_CHART = 10;

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey);
  return Number.isNaN(d.getTime()) ? weekKey : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Google Charts data: one line per giving fund across weeks. */
export function buildGivingLineChartByFund(weeks: DonationSummaryWeekRow[]): (string | number)[][] {
  if (!weeks.length) return [];

  const fundTotals = new Map<string, { key: string; label: string; total: number }>();
  const weekRows: { weekKey: string; label: string; amounts: Map<string, number> }[] = [];

  weeks.forEach((w) => {
    const weekKey = String(w.week || "");
    if (!weekKey) return;
    const amounts = new Map<string, number>();

    (w.donations || []).forEach((don) => {
      const rawName = String(don.fund?.name || "").trim();
      if (!rawName) return;
      const label = resolveTypeFromFundName(rawName, []);
      const key = normalizeToken(label) || label;
      const amount = Number(don.totalAmount || 0);
      amounts.set(key, (amounts.get(key) || 0) + amount);
      const prev = fundTotals.get(key) || { key, label, total: 0 };
      fundTotals.set(key, { key, label, total: prev.total + amount });
    });

    weekRows.push({ weekKey, label: formatWeekLabel(weekKey), amounts });
  });

  weekRows.sort((a, b) => new Date(a.weekKey).getTime() - new Date(b.weekKey).getTime());

  const topFunds = Array.from(fundTotals.values())
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_FUNDS_ON_LINE_CHART);

  if (!topFunds.length || !weekRows.length) return [];

  const header: (string | number)[] = ["Week", ...topFunds.map((f) => f.label)];
  const rows = weekRows.map((w) => {
    const row: (string | number)[] = [w.label];
    topFunds.forEach((f) => row.push(w.amounts.get(f.key) || 0));
    return row;
  });

  return [header, ...rows];
}

/** @deprecated Use fetchGivingSummaryWeeks + buildGivingLineChartByFund */
export async function fetchGivingWeeklySeries(
  startDate: string,
  endDate: string
): Promise<{ week: string; total: number }[]> {
  const weeks = await fetchGivingSummaryWeeks(startDate, endDate);
  return weeks
    .map((w) => ({
      week: String(w.week || ""),
      total: (w.donations || []).reduce((sum, d) => sum + Number(d.totalAmount || 0), 0)
    }))
    .filter((w) => w.week);
}

export async function fetchCampusNames(): Promise<string[]> {
  try {
    const campuses = asArray<{ name?: string }>(await ApiHelper.get("/campuses", "AttendanceApi"));
    return campuses.map((c) => String(c.name || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}
