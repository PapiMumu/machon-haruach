/**
 * Auto-created online batches were named `Online — {gateway} — {yyyy-mm-dd}`.
 * The batches table already has a date column; lists show only the gateway/method.
 */
export function formatBatchListName(raw?: string | null): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const legacy = s.match(/^Online\s*[—\-]\s*(.+?)\s*[—\-]\s*(\d{4}-\d{2}-\d{2})\s*$/);
  if (legacy) return legacy[1].trim();
  return s;
}
