import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDrawerStatus } from "@react-navigation/drawer";
import { ApiHelper } from "@machonharuach/helpers";
import { useUser } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { getSubscriptionDrawerModel } from "@/helpers/subscriptionUi";
import { useThemeColors } from "@/theme";
import { SecureStorageHelper } from "@/helpers/SecureStorageHelper";
import type { LoginResponseInterface } from "@/helpers/Interfaces";
import { getAccessBlockCode } from "@/helpers/AccessStatusHelper";

interface BillingStatusPayload {
  accessStatus?: "active" | "trialing" | "inactive";
  subscriptionStatus?: string | null;
  trialEndsAt?: string | Date | null;
  subscriptionEndsAt?: string | Date | null;
}

function normalizeBillingPayload(raw: unknown): BillingStatusPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const access = (o.accessStatus ?? o.access_status) as BillingStatusPayload["accessStatus"] | undefined;
  const subscriptionStatus = (o.subscriptionStatus ?? o.subscription_status) as string | null | undefined;
  const trialEndsAt = (o.trialEndsAt ?? o.trial_ends_at) as string | Date | null | undefined;
  const subscriptionEndsAt = (o.subscriptionEndsAt ?? o.subscription_ends_at) as string | Date | null | undefined;
  return { accessStatus: access, subscriptionStatus: subscriptionStatus ?? null, trialEndsAt, subscriptionEndsAt };
}

/**
 * Load subscription fields for the drawer. Prefer `POST /users/login` with `default_jwt` (anonymous),
 * which matches session restore and does not depend on church-scoped API JWT or a deployed `/billingStatus` route.
 */
async function syncSubscriptionDrawerFields(userId: string): Promise<void> {
  const markInactive = () => {
    const fresh = useAuthStore.getState().user;
    if (!fresh || fresh.id !== userId) return;
    useAuthStore.getState().setUser({
      ...fresh,
      accessStatus: "inactive",
      subscriptionStatus: fresh.subscriptionStatus || "inactive"
    });
  };

  const applyFromLogin = (data: LoginResponseInterface) => {
    const fresh = useAuthStore.getState().user;
    if (!fresh || fresh.id !== userId || !data.user) return;
    useAuthStore.getState().setUser({
      ...fresh,
      ...data.user,
      jwt: fresh.jwt || data.user.jwt,
      accessStatus: data.accessStatus ?? fresh.accessStatus,
      subscriptionStatus: data.subscriptionStatus ?? fresh.subscriptionStatus,
      trialEndsAt: data.trialEndsAt ?? fresh.trialEndsAt,
      subscriptionEndsAt: data.subscriptionEndsAt ?? fresh.subscriptionEndsAt
    });
  };

  const jwt = await SecureStorageHelper.getSecureItem("default_jwt");
  if (!jwt?.trim()) return;

  try {
    const data = (await ApiHelper.postAnonymous("/users/login", { jwt }, "MembershipApi")) as LoginResponseInterface;
    if (getAccessBlockCode(data)) {
      markInactive();
      return;
    }
    if (data?.user?.id !== userId) return;
    applyFromLogin(data);
  } catch (e: unknown) {
    if (getAccessBlockCode(e)) {
      markInactive();
      return;
    }
    try {
      const raw = await ApiHelper.get("/users/billingStatus", "MembershipApi");
      const normalized = normalizeBillingPayload(raw);
      if (!normalized) return;
      const fresh = useAuthStore.getState().user;
      if (!fresh || fresh.id !== userId) return;
      useAuthStore.getState().setUser({
        ...fresh,
        accessStatus: normalized.accessStatus,
        subscriptionStatus:
          normalized.subscriptionStatus == null ? undefined : String(normalized.subscriptionStatus).trim() || undefined,
        trialEndsAt: normalized.trialEndsAt as Date | null | undefined,
        subscriptionEndsAt: normalized.subscriptionEndsAt as Date | null | undefined
      });
    } catch {
      /* leave existing persisted user; UI may stay on unknown */
    }
  }
}

export function DrawerSubscriptionStatus() {
  const { t } = useTranslation();
  const user = useUser();
  const tc = useThemeColors();
  const drawerStatus = useDrawerStatus();

  /** Sync when the signed-in user changes (drawer content may not receive reliable `useDrawerStatus`). */
  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      try {
        await syncSubscriptionDrawerFields(user.id);
      } catch {
        /* offline or session not ready */
      }
    })();
  }, [user?.id]);

  /** Refresh when the menu opens so the label stays current. */
  useEffect(() => {
    if (drawerStatus !== "open" || !user?.id) return;
    void (async () => {
      try {
        await syncSubscriptionDrawerFields(user.id);
      } catch {
        /* ignore */
      }
    })();
  }, [drawerStatus, user?.id]);

  const model = useMemo(() => getSubscriptionDrawerModel(user), [user]);

  const content = useMemo(() => {
    if (!model) return null;
    const text = { titleColor: tc.text, subtitleColor: tc.textSecondary, chevronColor: tc.textSecondary };
    switch (model.kind) {
      case "trial": {
        const days = model.trialDaysLeft;
        const subtitle =
          days === undefined
            ? t("subscription.drawerTrialSubtitleUnknown")
            : days <= 0
              ? t("subscription.drawerTrialEndsToday")
              : days === 1
                ? t("subscription.drawerTrialOneDay")
                : t("subscription.drawerTrialDaysLeft", { days });
        return {
          icon: "schedule" as const,
          title: t("subscription.drawerTrialTitle"),
          subtitle,
          border: tc.warning,
          bg: tc.warningBg,
          iconColor: tc.warning,
          ...text,
          actionable: true
        };
      }
      case "active":
        return {
          icon: "verified" as const,
          title: t("subscription.drawerSubscribedTitle"),
          subtitle: t("subscription.drawerSubscribedSubtitle"),
          border: tc.success,
          bg: tc.successBg,
          iconColor: tc.success,
          ...text,
          actionable: false
        };
      case "past_due":
        return {
          icon: "warning" as const,
          title: t("subscription.drawerPastDueTitle"),
          subtitle: t("subscription.drawerPastDueSubtitle"),
          border: tc.warning,
          bg: tc.warningLight,
          iconColor: tc.warning,
          ...text,
          actionable: true
        };
      case "expired":
        return {
          icon: "error-outline" as const,
          title: t("subscription.drawerExpiredTitle"),
          subtitle: t("subscription.drawerExpiredSubtitle"),
          border: tc.error,
          bg: tc.errorBg,
          iconColor: tc.error,
          ...text,
          actionable: true
        };
      case "unknown":
        return {
          icon: "info-outline" as const,
          title: t("subscription.drawerUnknownTitle"),
          subtitle: t("subscription.drawerUnknownSubtitle"),
          border: tc.border,
          bg: tc.iconBackground,
          iconColor: tc.textSecondary,
          ...text,
          actionable: true
        };
      default:
        return null;
    }
  }, [model, t, tc.text, tc.textSecondary, tc.warning, tc.warningBg, tc.warningLight, tc.success, tc.successBg, tc.error, tc.errorBg, tc.border, tc.iconBackground]);

  if (!content) return null;

  const inner = (
    <View style={[styles.row, { borderColor: content.border, backgroundColor: content.bg }]}>
      <MaterialIcons name={content.icon} size={22} color={content.iconColor} style={styles.icon} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: content.titleColor }]} numberOfLines={2}>
          {content.title}
        </Text>
        <Text style={[styles.subtitle, { color: content.subtitleColor }]} numberOfLines={5}>
          {content.subtitle}
        </Text>
      </View>
      {content.actionable ? (
        <MaterialIcons name="chevron-right" size={22} color={content.chevronColor} />
      ) : null}
    </View>
  );

  if (content.actionable) {
    return (
      <Pressable
        onPress={() => router.push("/(drawer)/membershipSubscribe")}
        style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityHint={t("subscription.membershipCheckoutHint")}>
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.wrap}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  icon: { marginTop: 1 },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  }
});
