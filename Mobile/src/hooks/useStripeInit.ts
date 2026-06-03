import { useEffect } from "react";
import { initStripe } from "@stripe/stripe-react-native";
import { ErrorHelper } from "../helpers/ErrorHelper";

/** Module-level cache so initStripe is only called once per unique publishable key. */
let _initializedKey = "";

export function useStripeInit(publishableKey: string | undefined) {
  useEffect(() => {
    const key = publishableKey || "";
    if (!key || key === _initializedKey) return;

    let cancelled = false;
    (async () => {
      try {
        await initStripe({ publishableKey: key });
        if (!cancelled) _initializedKey = key;
      } catch (err) {
        if (!cancelled) ErrorHelper.logError("stripe-init", err as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publishableKey]);
}
