import crypto from "crypto";
import Axios from "axios";

export type PaynowInitiateRequest = {
  integrationId: string;
  integrationKey: string;
  reference: string;
  amount: number;
  additionalInfo?: string;
  returnUrl: string;
  resultUrl: string;
  authEmail?: string;
  authPhone?: string;
  authName?: string;
  tokenize?: boolean;
  merchantTrace?: string;
  method?: string;
  token?: string;
  phone?: string;
};

export type PaynowInitiateResult =
  | { ok: true; browserUrl: string; pollUrl: string; raw: Record<string, string> }
  | { ok: false; error: string; raw?: Record<string, string> };

export type PaynowPollResult =
  | { ok: true; status: string; reference?: string; paynowReference?: string; pollUrl?: string; amount?: string; raw: Record<string, string> }
  | { ok: false; error: string; raw?: Record<string, string> };

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const PAYNOW_EXPRESS_URL = "https://www.paynow.co.zw/api/initiate-express-checkout";

function urlEncodeForm(fields: Array<[string, string]>): string {
  return fields.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

function parseOrderedPostString(body: string): { ordered: Array<[string, string]>; map: Record<string, string> } {
  const ordered: Array<[string, string]> = [];
  const map: Record<string, string> = {};
  const parts = (body || "").split("&").filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf("=");
    const rawKey = idx >= 0 ? part.slice(0, idx) : part;
    const rawVal = idx >= 0 ? part.slice(idx + 1) : "";
    const key = decodeURIComponent(rawKey || "").trim();
    const value = decodeURIComponent(rawVal || "").trim();
    ordered.push([key, value]);
    map[key.toLowerCase()] = value;
  }
  return { ordered, map };
}

function sha512UpperHex(input: string): string {
  return crypto.createHash("sha512").update(Buffer.from(input, "utf8")).digest("hex").toUpperCase();
}

function createHashFromOrderedPairs(pairs: Array<[string, string]>, integrationKey: string): string {
  let concat = "";
  for (const [k, v] of pairs) {
    if (k.toLowerCase() === "hash") continue;
    concat += v ?? "";
  }
  concat += integrationKey;
  return sha512UpperHex(concat);
}

function verifyHashFromOrderedPairs(pairs: Array<[string, string]>, integrationKey: string): boolean {
  const map: Record<string, string> = {};
  for (const [k, v] of pairs) map[k.toLowerCase()] = v;
  const provided = (map.hash || "").toUpperCase();
  if (!provided) return false;
  const expected = createHashFromOrderedPairs(pairs, integrationKey);
  return provided === expected;
}

export class PaynowHelper {
  static async initiateTransaction(req: PaynowInitiateRequest): Promise<PaynowInitiateResult> {
    const integrationId = (req.integrationId || "").trim();
    const integrationKey = (req.integrationKey || "").trim();
    if (!integrationId || !integrationKey) return { ok: false, error: "Paynow credentials are missing" };

    const amount = Number(req.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Invalid amount" };

    const baseFields: Array<[string, string]> = [
      ["id", integrationId],
      ["reference", req.reference],
      ["amount", amount.toFixed(2)]
    ];

    if (req.additionalInfo) baseFields.push(["additionalinfo", req.additionalInfo]);
    baseFields.push(["returnurl", req.returnUrl]);
    baseFields.push(["resulturl", req.resultUrl]);
    if (req.authEmail) baseFields.push(["authemail", req.authEmail]);
    if (req.authPhone) baseFields.push(["authphone", req.authPhone]);
    if (req.authName) baseFields.push(["authname", req.authName]);
    if (typeof req.tokenize === "boolean") baseFields.push(["tokenize", req.tokenize ? "true" : "false"]);
    if (req.merchantTrace) baseFields.push(["merchanttrace", req.merchantTrace]);
    if (req.method) baseFields.push(["method", req.method]);
    if (req.token) baseFields.push(["token", req.token]);
    if (req.phone) baseFields.push(["phone", req.phone]);
    baseFields.push(["status", "Message"]);

    const hash = createHashFromOrderedPairs(baseFields, integrationKey);
    const fieldsWithHash: Array<[string, string]> = [...baseFields, ["hash", hash]];

    try {
      const body = urlEncodeForm(fieldsWithHash);
      const resp = await Axios.post(PAYNOW_INITIATE_URL, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000
      });

      const { ordered, map } = parseOrderedPostString(String(resp.data || ""));
      const raw = Object.fromEntries(ordered) as Record<string, string>;

      const status = (map.status || "").toLowerCase();
      if (status !== "ok") {
        return { ok: false, error: map.error || "Paynow initiate failed", raw };
      }

      if (!verifyHashFromOrderedPairs(ordered, integrationKey)) {
        return { ok: false, error: "Invalid Paynow response hash", raw };
      }

      const browserUrl = map.browserurl || "";
      const pollUrl = map.pollurl || "";
      if (!browserUrl || !pollUrl) {
        return { ok: false, error: "Paynow response missing browserurl or pollurl", raw };
      }

      return { ok: true, browserUrl, pollUrl, raw };
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Paynow initiate request failed";
      return { ok: false, error: msg };
    }
  }

  static async initiateExpressTransaction(req: PaynowInitiateRequest): Promise<PaynowInitiateResult> {
    const integrationId = (req.integrationId || "").trim();
    const integrationKey = (req.integrationKey || "").trim();
    if (!integrationId || !integrationKey) return { ok: false, error: "Paynow credentials are missing" };

    const amount = Number(req.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Invalid amount" };
    if (!req.method) return { ok: false, error: "Paynow express method is required" };

    const baseFields: Array<[string, string]> = [
      ["id", integrationId],
      ["reference", req.reference],
      ["amount", amount.toFixed(2)]
    ];

    if (req.additionalInfo) baseFields.push(["additionalinfo", req.additionalInfo]);
    baseFields.push(["returnurl", req.returnUrl]);
    baseFields.push(["resulturl", req.resultUrl]);
    if (req.authEmail) baseFields.push(["authemail", req.authEmail]);
    if (req.authPhone) baseFields.push(["authphone", req.authPhone]);
    if (req.authName) baseFields.push(["authname", req.authName]);
    if (req.merchantTrace) baseFields.push(["merchanttrace", req.merchantTrace]);
    baseFields.push(["method", req.method]);
    if (req.token) baseFields.push(["token", req.token]);
    if (req.phone) baseFields.push(["phone", req.phone]);
    baseFields.push(["status", "Message"]);

    const hash = createHashFromOrderedPairs(baseFields, integrationKey);
    const fieldsWithHash: Array<[string, string]> = [...baseFields, ["hash", hash]];
    const body = urlEncodeForm(fieldsWithHash);

    const parseInitiateResponse = (payload: any): PaynowInitiateResult => {
      const { ordered, map } = parseOrderedPostString(String(payload || ""));
      const raw = Object.fromEntries(ordered) as Record<string, string>;
      const status = (map.status || "").toLowerCase();
      if (status !== "ok") return { ok: false, error: map.error || "Paynow express initiate failed", raw };
      if (!verifyHashFromOrderedPairs(ordered, integrationKey)) return { ok: false, error: "Invalid Paynow response hash", raw };
      const browserUrl = map.browserurl || "";
      const pollUrl = map.pollurl || "";
      if (!pollUrl) return { ok: false, error: "Paynow response missing pollurl", raw };
      return { ok: true, browserUrl, pollUrl, raw };
    };

    try {
      const resp = await Axios.post(PAYNOW_EXPRESS_URL, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000
      });
      return parseInitiateResponse(resp.data);
    } catch (err: any) {
      // Compatibility fallback for integrations where express endpoint is not enabled.
      try {
        const resp = await Axios.post(PAYNOW_INITIATE_URL, body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 20000
        });
        return parseInitiateResponse(resp.data);
      } catch (fallbackErr: any) {
        const msg = fallbackErr?.response?.data?.error || fallbackErr?.message || err?.message || "Paynow express request failed";
        return { ok: false, error: msg };
      }
    }
  }

  static async pollStatus(pollUrl: string, integrationKey: string): Promise<PaynowPollResult> {
    const url = (pollUrl || "").trim();
    const key = (integrationKey || "").trim();
    if (!url || !key) return { ok: false, error: "Missing pollUrl or integrationKey" };

    try {
      const resp = await Axios.post(url, "", {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000
      });

      const { ordered, map } = parseOrderedPostString(String(resp.data || ""));
      const raw = Object.fromEntries(ordered) as Record<string, string>;

      if (!verifyHashFromOrderedPairs(ordered, key)) {
        return { ok: false, error: "Invalid Paynow status hash", raw };
      }

      const status = map.status || "";
      if (!status) return { ok: false, error: "Paynow status response missing status", raw };

      return {
        ok: true,
        status,
        reference: map.reference,
        paynowReference: map.paynowreference,
        pollUrl: map.pollurl,
        amount: map.amount,
        raw
      };
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Paynow poll failed";
      return { ok: false, error: msg };
    }
  }
}

