import { useQuery } from "@tanstack/react-query";
import { ApiHelper } from "@machonharuach/helpers";

export interface MembershipSubscriptionSettings {
  /** First numeric amount from `mobileSubscriptionMonthlyAmount` (e.g. "10.00 USD" → "10.00"). */
  monthlyAmountHint: string;
}

function parseMonthlyHint(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const match = s.match(/[\d]+(?:[.,]\d{0,2})?/);
  return match ? match[0].replace(",", ".") : "";
}

export function useMembershipSubscriptionSettings(churchId: string | undefined) {
  return useQuery({
    queryKey: ["/settings", "MembershipApi", "mobileSubscription", churchId || ""],
    enabled: !!churchId,
    queryFn: async (): Promise<MembershipSubscriptionSettings> => {
      const settings = await ApiHelper.get("/settings", "MembershipApi");
      const arr = Array.isArray(settings) ? settings : [];
      const raw = String(arr.find((s: { keyName?: string }) => s.keyName === "mobileSubscriptionMonthlyAmount")?.value || "");
      return { monthlyAmountHint: parseMonthlyHint(raw) };
    },
    staleTime: 5 * 60 * 1000
  });
}
