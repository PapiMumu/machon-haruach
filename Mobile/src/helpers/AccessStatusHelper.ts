export type AccessBlockCode = "TRIAL_EXPIRED" | "SUBSCRIPTION_INACTIVE";

function tryParseJsonObject(value: unknown): any | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function collectPayloads(input: any): any[] {
  const out: any[] = [];
  const push = (v: any) => {
    if (v !== undefined && v !== null) out.push(v);
  };
  push(input);
  if (input?.response?.data) push(input.response.data);
  const msg = typeof input?.message === "string" ? input.message : "";
  const fromMessage = tryParseJsonObject(msg);
  if (fromMessage) push(fromMessage);
  return out;
}

function blockFromPayload(payload: any): AccessBlockCode | null {
  if (!payload) return null;
  const errors = Array.isArray(payload.errors) ? payload.errors.map((e: any) => String(e)) : [];
  if (errors.includes("TRIAL_EXPIRED")) return "TRIAL_EXPIRED";
  if (errors.includes("SUBSCRIPTION_INACTIVE")) return "SUBSCRIPTION_INACTIVE";
  if (String(payload.accessStatus || "").toLowerCase() === "inactive") return "SUBSCRIPTION_INACTIVE";
  return null;
}

/** Detect trial/subscription blocks from API JSON, axios-style errors, or Error whose message is JSON (ApiHelper uses response.text() then throws). */
export function getAccessBlockCode(input: any): AccessBlockCode | null {
  if (!input) return null;
  for (const payload of collectPayloads(input)) {
    const found = blockFromPayload(payload);
    if (found) return found;
  }
  const raw =
    (typeof input?.message === "string" && input.message) ||
    (typeof input?.cause?.message === "string" && input.cause.message) ||
    "";
  if (raw.includes("TRIAL_EXPIRED")) return "TRIAL_EXPIRED";
  if (raw.includes("SUBSCRIPTION_INACTIVE")) return "SUBSCRIPTION_INACTIVE";
  return null;
}

export function isAccessBlocked(input: any): boolean {
  return getAccessBlockCode(input) !== null;
}
