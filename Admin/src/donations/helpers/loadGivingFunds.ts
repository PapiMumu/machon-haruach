import { ApiHelper, UserHelper } from "@machonharuach/apphelper";
import type { FundInterface } from "@machonharuach/helpers";
import { copyGatewayFundCatalogFallback } from "./givingGatewayFundDefaults";

/** Normalize Giving API fund list payloads (plain array, `{ data }`, etc.). */
export function asGivingFundsArray(input: unknown): FundInterface[] {
  if (Array.isArray(input)) return input as FundInterface[];
  if (!input) return [];
  if (typeof input === "string") {
    try {
      return asGivingFundsArray(JSON.parse(input));
    } catch {
      return [];
    }
  }
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    const candidate = o.data ?? o.items ?? o.results ?? o.rows ?? o.funds;
    if (Array.isArray(candidate)) return candidate as FundInterface[];
    if (candidate && typeof candidate === "object") return Object.values(candidate) as FundInterface[];
    return Object.values(o) as FundInterface[];
  }
  return [];
}

/**
 * Load church fund rows from the DB when present; otherwise use the same default catalog as
 * Mobile / gateways (slug ids: tithe, seed, offering, …) so Giving UIs are not empty when
 * donations only reference gateway fund ids without `funds` table rows.
 */
export async function loadGivingFundsCatalog(): Promise<FundInterface[]> {
  const churchId = UserHelper.currentUserChurch?.church?.id;
  if (churchId) {
    try {
      const byChurch = asGivingFundsArray(await ApiHelper.get(`/funds/churchId/${churchId}`, "GivingApi"));
      if (byChurch.length > 0) return byChurch;
    } catch {
      /* fall through */
    }
  }
  try {
    const direct = asGivingFundsArray(await ApiHelper.get("/funds", "GivingApi"));
    if (direct.length > 0) return direct;
  } catch {
    /* fall through */
  }
  return copyGatewayFundCatalogFallback();
}
