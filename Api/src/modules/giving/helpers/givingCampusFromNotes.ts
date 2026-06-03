/**
 * Reads `givingCampus|{name}` from donation notes (same convention as Mobile / GivingDashboard).
 */
export function extractGivingCampusFromNotes(notes: string | null | undefined): string {
  if (!notes || typeof notes !== "string") return "";
  const marker = "givingCampus|";
  const idx = notes.indexOf(marker);
  if (idx === -1) return "";
  const after = notes.slice(idx + marker.length);
  const line = after.match(/^[^\r\n]+/);
  const raw = (line ? line[0] : after).trim();
  return raw.slice(0, 128);
}
