import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useStripeInit } from "./useStripeInit";
import { useTranslation } from "react-i18next";
import { DonationImpact, GatewayData, StripePaymentMethod } from "../interfaces";
import { ErrorHelper } from "../helpers/ErrorHelper";
import { useDonationFunds } from "./useStaleWhileRevalidate";
import { useCurrentUserChurch } from "../stores/useUserStore";

export function useDonationTabData() {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>([]);
  const [publishKey, setPublishKey] = useState<string>("");
  const isFocused = useIsFocused();
  const currentUserChurch = useCurrentUserChurch();
  const person = currentUserChurch?.person;
  const [selectedRepeatDonation, setSelectedRepeatDonation] = useState<{ amount: string; fundId?: string } | null>(null);

  // Warm funds cache for giving flows (same as legacy donation tab).
  useDonationFunds(currentUserChurch?.church?.id || "");

  const {
    data: gatewayData,
    isLoading: gatewayLoading,
    isFetching: gatewayFetching,
    refetch: refetchGateway
  } = useQuery<GatewayData[]>({
    queryKey: ["/gateways/churchId/" + currentUserChurch?.church?.id, "GivingApi"],
    enabled: !!currentUserChurch?.church?.id && isFocused,
    placeholderData: [],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: customerData, isLoading: customerLoading } = useQuery<any>({
    queryKey: ["/customers?personId=" + person?.id, "GivingApi"],
    enabled: !!person?.id && isFocused,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const {
    data: paymentMethodsData,
    isLoading: paymentMethodsLoading,
    refetch: refetchPaymentMethods
  } = useQuery<StripePaymentMethod[]>({
    queryKey: ["/paymentmethods/personid/" + person?.id, "GivingApi"],
    enabled: !!person?.id && isFocused,
    placeholderData: [],
    staleTime: 0,
    gcTime: 10 * 60 * 1000
  });

  const {
    data: donationImpactData = [],
    isLoading: donationImpactLoading,
    refetch: refetchDonation
  } = useQuery<DonationImpact[]>({
    queryKey: ["/donations/my", "GivingApi"],
    enabled: isFocused,
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const areMethodsLoading = gatewayLoading || customerLoading || paymentMethodsLoading || donationImpactLoading;
  const stripeGateway = useMemo(
    () => (gatewayData || []).find(g => (g.provider || "").toLowerCase() === "stripe") ?? null,
    [gatewayData]
  );
  const stripeReady = !stripeGateway || !!publishKey;

  const stripePublicKey = stripeGateway?.publicKey || "";

  useStripeInit(stripePublicKey);

  useEffect(() => {
    if (stripePublicKey) setPublishKey(stripePublicKey);
  }, [stripePublicKey]);

  useEffect(() => {
    if (paymentMethodsData && Array.isArray(paymentMethodsData) && paymentMethodsData.length > 0) {
      const methods = paymentMethodsData.map((item: any) => new StripePaymentMethod(item));
      setCustomerId(paymentMethodsData[0]?.customerId || "");
      setPaymentMethods(methods);
    } else if (customerData && (!paymentMethodsData || paymentMethodsData.length === 0)) {
      const cust = Array.isArray(customerData) ? customerData[0] : customerData;
      const cid = cust?.id || cust?.customerId || "";
      setCustomerId(cid);
      setPaymentMethods([]);
    }
  }, [paymentMethodsData, customerData]);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([refetchGateway(), refetchPaymentMethods(), refetchDonation()]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        Alert.alert(t("donations.failedPaymentMethods"), err?.message ?? "");
        ErrorHelper.logError("load-donations", err);
      }
    }
  }, [refetchGateway, refetchPaymentMethods, refetchDonation, t]);

  const givingStats = useMemo(() => {
    const all = (donationImpactData ?? []).slice();
    all.sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());

    const nowYear = new Date().getFullYear();
    const ytdItems = all.filter((d) => new Date(d.donationDate).getFullYear() === nowYear);

    const ytd = ytdItems.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalGifts = ytdItems.length;

    const lastGiftDonation = all[0];
    const lastGift = lastGiftDonation?.amount ?? 0;
    const lastGiftDate = lastGiftDonation ? new Date(lastGiftDonation.donationDate) : null;

    return { ytd, totalGifts, lastGift, lastGiftDate };
  }, [donationImpactData]);

  const impactData = useMemo(() => {
    const computeImpact = (items: DonationImpact[]) => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const ytdItems = (items ?? []).filter((d) => new Date(d.donationDate).getFullYear() === currentYear);

      if (!ytdItems.length) {
        return {
          score: 0,
          tier: "Bronze",
          message: t("donations.impactMessageStarter", "Start giving this month to grow your impact rating.")
        };
      }

      const elapsedMonths = now.getMonth() + 1;
      const activeMonths = new Set(ytdItems.map((d) => new Date(d.donationDate).getMonth())).size;
      const consistencyScore = Math.min(100, (activeMonths / Math.max(1, elapsedMonths)) * 100);

      const mostRecentGiftDate = ytdItems
        .map((d) => new Date(d.donationDate).getTime())
        .sort((a, b) => b - a)[0];
      const daysSinceGift = Math.max(0, Math.floor((now.getTime() - mostRecentGiftDate) / (1000 * 60 * 60 * 24)));
      const recencyScore = Math.max(0, 100 - (daysSinceGift / 90) * 100);

      const totalAmount = ytdItems.reduce((sum, d) => sum + (d.amount || 0), 0);
      const amountScore = Math.min(100, (Math.log10(totalAmount + 1) / Math.log10(5000 + 1)) * 100);
      const giftCountScore = Math.min(100, (ytdItems.length / 24) * 100);
      const generosityScore = amountScore * 0.7 + giftCountScore * 0.3;

      const score = Math.max(0, Math.min(100, Math.round(consistencyScore * 0.4 + recencyScore * 0.25 + generosityScore * 0.35)));
      const tier = score >= 80 ? "Platinum" : score >= 60 ? "Gold" : score >= 35 ? "Silver" : "Bronze";

      const messageByTier: Record<string, string> = {
        Bronze: t("donations.impactMessageBronze", "You are building momentum. Keep going."),
        Silver: t("donations.impactMessageSilver", "Great consistency. Your giving is making a difference."),
        Gold: t("donations.impactMessageGold", "Strong impact. Your generosity is growing lives."),
        Platinum: t("donations.impactMessagePlatinum", "Outstanding impact. Thank you for leading in generosity.")
      };

      return { score, tier, message: messageByTier[tier] };
    };

    const allDonations = donationImpactData ?? [];
    const givingImpact = computeImpact(allDonations);

    const fundConfigs = [
      { key: "tithe", name: t("donations.tithe", "Tithe") },
      { key: "seed", name: t("donations.seed", "Seed") },
      { key: "offering", name: t("donations.offering", "Offering") }
    ];

    const givingImpactByFund = fundConfigs.map((fund) => {
      const fundDonations = allDonations.filter((d) => {
        const fundName = (d.fund?.name || "").toLowerCase();
        const fundId = (d.fund?.id || "").toLowerCase();
        return fundName.includes(fund.key) || fundId.includes(fund.key);
      });
      return {
        key: fund.key,
        name: fund.name,
        ...computeImpact(fundDonations)
      };
    });

    return { givingImpact, givingImpactByFund };
  }, [donationImpactData, t]);

  return {
    t,
    person,
    customerId,
    paymentMethods,
    publishKey,
    gatewayData,
    stripeGateway,
    gatewayLoading,
    gatewayFetching,
    donationImpactData,
    donationImpactLoading,
    stripeReady,
    areMethodsLoading,
    givingStats,
    givingImpact: impactData.givingImpact,
    givingImpactByFund: impactData.givingImpactByFund,
    loadData,
    refetchPaymentMethods,
    selectedRepeatDonation,
    setSelectedRepeatDonation
  };
}
