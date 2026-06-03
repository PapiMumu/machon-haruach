/**
 * Maps EcoCash transaction lookup payloads to a single status for clients.
 * Provider shapes vary; avoid interpreting free-text `message` as failure
 * (docs and copy often contain the word "error").
 */
export type EcoCashNormalizedStatus = "pending" | "success" | "failed";

function toLowerText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function collectStatusLikeStrings(obj: Record<string, unknown> | null | undefined, depth: number): string[] {
  if (!obj || typeof obj !== "object" || depth < 0) return [];
  const keys = [
    "status",
    "transactionStatus",
    "paymentStatus",
    "state",
    "result",
    "transactionState",
    "paymentState"
  ];
  const out: string[] = [];
  for (const k of keys) {
    const v = (obj as any)[k];
    if (typeof v === "string" && v.trim()) out.push(toLowerText(v));
    if (typeof v === "number" && Number.isFinite(v)) out.push(String(v));
  }
  const nested = (obj as any).data;
  if (nested && typeof nested === "object") {
    out.push(...collectStatusLikeStrings(nested as Record<string, unknown>, depth - 1));
  }
  return out;
}

function collectResultCodes(obj: Record<string, unknown> | null | undefined, depth: number): string[] {
  if (!obj || typeof obj !== "object" || depth < 0) return [];
  const keys = ["code", "statusCode", "resultCode", "responseCode"];
  const out: string[] = [];
  for (const k of keys) {
    const v = (obj as any)[k];
    if (v === undefined || v === null) continue;
    out.push(toLowerText(v));
  }
  const nested = (obj as any).data;
  if (nested && typeof nested === "object") {
    out.push(...collectResultCodes(nested as Record<string, unknown>, depth - 1));
  }
  return out;
}

function isSuccessBlob(text: string): boolean {
  if (!text) return false;
  return (
    text.includes("success") ||
    text.includes("succeeded") ||
    text.includes("successful") ||
    text.includes("completed") ||
    text.includes("complete") ||
    text.includes("approved") ||
    text.includes("paid") ||
    text === "ok"
  );
}

function isFailureBlob(text: string): boolean {
  if (!text) return false;
  return /\b(failed|failure|declined|rejected|cancelled|canceled|voided|void)\b/i.test(text);
}

export function normalizeEcoCashLookupPayload(data: unknown): EcoCashNormalizedStatus {
  if (!data || typeof data !== "object") return "pending";
  const root = data as Record<string, unknown>;
  const blobs = collectStatusLikeStrings(root, 2);
  const combined = blobs.join(" ");

  if (blobs.some(isSuccessBlob) || isSuccessBlob(combined)) return "success";
  if (blobs.some(isFailureBlob) || isFailureBlob(combined)) return "failed";

  const codes = collectResultCodes(root, 2);
  for (const c of codes) {
    const digits = c.replace(/\D/g, "");
    if (c === "00" || c === "000" || digits === "0") return "success";
  }

  return "pending";
}
