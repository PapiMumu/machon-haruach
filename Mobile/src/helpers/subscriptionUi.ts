import dayjs from "dayjs";
import type { UserInterface } from "./Interfaces";

export type SubscriptionDrawerKind = "trial" | "active" | "expired" | "past_due" | "unknown";

export interface SubscriptionDrawerModel {
  kind: SubscriptionDrawerKind;
  /** Calendar days left in trial; undefined if end date unknown. */
  trialDaysLeft?: number;
}

export function parseSubscriptionDate(value: unknown): dayjs.Dayjs | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }
  return null;
}

/** Derive trial / active / expired for UI — aligned with `resolveAccess` / billing (no default to "subscribed"). */
export function getSubscriptionDrawerModel(user: UserInterface | null): SubscriptionDrawerModel | null {
  if (!user) return null;

  const access = user.accessStatus ? String(user.accessStatus).toLowerCase() : "";
  const rawSub = user.subscriptionStatus;
  const status =
    rawSub === undefined || rawSub === null || String(rawSub).trim() === "" ? "" : String(rawSub).toLowerCase();
  const now = dayjs();

  if (access === "inactive") {
    return { kind: "expired" };
  }

  if (access === "trialing" || status === "trialing") {
    const end = parseSubscriptionDate(user.trialEndsAt);
    if (end && !end.isAfter(now)) {
      return { kind: "expired" };
    }
    let trialDaysLeft: number | undefined;
    if (end) {
      trialDaysLeft = Math.max(0, end.startOf("day").diff(now.startOf("day"), "day"));
    }
    return { kind: "trial", trialDaysLeft };
  }

  if (status === "canceled" || status === "inactive") {
    const subEnd = parseSubscriptionDate(user.subscriptionEndsAt);
    if (subEnd?.isAfter(now)) {
      return { kind: "active" };
    }
    return { kind: "expired" };
  }

  if (status === "past_due") {
    const subEnd = parseSubscriptionDate(user.subscriptionEndsAt);
    if (subEnd?.isAfter(now)) {
      return { kind: "past_due" };
    }
    return { kind: "expired" };
  }

  if (status === "active") {
    return { kind: "active" };
  }

  if (access === "active") {
    return { kind: "active" };
  }

  // Billing/login sometimes omits `subscriptionStatus` but still sends dates (or stale client).
  const trialEnd = parseSubscriptionDate(user.trialEndsAt);
  if (trialEnd?.isAfter(now) && access !== "inactive") {
    const trialDaysLeft = Math.max(0, trialEnd.startOf("day").diff(now.startOf("day"), "day"));
    return { kind: "trial", trialDaysLeft };
  }

  const subEnd = parseSubscriptionDate(user.subscriptionEndsAt);
  if (subEnd?.isAfter(now) && access !== "inactive") {
    return { kind: "active" };
  }

  return { kind: "unknown" };
}
