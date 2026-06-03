/**
 * Standalone checks for Giving dashboard investigation (no Jest; run: npx tsx tools/runGivingAssumptions.ts)
 */
import assert from "node:assert/strict";

const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";

function parseCampusFromGivingNotes(notes?: string): string {
  const n = String(notes || "");
  const idx = n.indexOf(GIVING_CAMPUS_NOTE_PREFIX);
  if (idx === -1) return "";
  const tail = n.slice(idx + GIVING_CAMPUS_NOTE_PREFIX.length);
  const line = tail.split(/\r\n|\n|\r/)[0] ?? "";
  return line.trim();
}

function normalizeFundTotalApiRow(raw: Record<string, unknown> | null): {
  fundName: string;
  givingCampusFromNotes: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const campus =
    r.givingCampusFromNotes ?? r.givingcampusfromnotes ?? r.GivingCampusFromNotes ?? "";
  const fundName = r.fundName ?? r.fundname ?? r.FundName ?? "";
  const f = String(fundName || "").trim();
  const c = String(campus || "").trim();
  return f ? { fundName: f, givingCampusFromNotes: c } : null;
}

console.log("Giving dashboard assumption checks…");

// 1) Lowercase keys: naive read loses campus
const mysqlLike = { fundname: "Tithe", givingcampusfromnotes: "Harare", totalamount: 100 };
assert.equal((mysqlLike as any).givingCampusFromNotes, undefined);
const norm = normalizeFundTotalApiRow(mysqlLike);
assert.deepEqual(norm, { fundName: "Tithe", givingCampusFromNotes: "Harare" });
console.log("  ✓ Lowercase API keys need normalization for campus attribution.");

// 2) Notes parsing
assert.equal(parseCampusFromGivingNotes("givingCampus|Harare"), "Harare");
assert.equal(parseCampusFromGivingNotes("no tag"), "");
console.log("  ✓ givingCampus| notes parsing.");

// 3) Unknown fund when id not in map
const fundNameById = new Map<string, string>([["uuid-1", "Tithe"]]);
const label = (fundNameById.get("wrong") || "").trim() || "Unknown fund";
assert.equal(label, "Unknown fund");
console.log("  ✓ Missing fundId in catalog → Unknown fund label.");

// 4) Unassigned when multi-campus and no campus string
const campusNames = ["Birmingham", "Harare"];
const fromNotes = "";
const unassigned = campusNames.length > 1 && !fromNotes.trim();
assert.equal(unassigned, true);
console.log("  ✓ Empty campus + multiple campuses → Unassigned bucket.");

console.log("\nAll checks passed.");
