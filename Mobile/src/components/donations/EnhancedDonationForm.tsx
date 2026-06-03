import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, StyleSheet, TouchableOpacity, Alert, Image, Modal, ScrollView, TextInput, useWindowDimensions } from "react-native";
import { Card, Text, Button, Switch, Menu } from "react-native-paper";
import { Poppins_800ExtraBold, useFonts } from "@expo-google-fonts/poppins";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQuery } from "@tanstack/react-query";
import { CardFieldInput, createPaymentMethod, collectBankAccountForSetup, confirmSetupIntent } from "@stripe/stripe-react-native";
import { ApiHelper, CurrencyHelper } from "../../helpers";
import { getCardLogo } from "../../helpers/cardLogos";
import { FundInterface, StripeDonationInterface, StripePaymentMethod } from "../../interfaces";
import { useUser, useCurrentUserChurch } from "../../stores/useUserStore";
import { useEngagementStore } from "../../stores/useEngagementStore";
import { DonationComplete } from "./DonationComplete";
import DatePicker from "react-native-date-picker";
import dayjs from "../../helpers/dayjsConfig";
import { DimensionHelper } from "@/helpers/DimensionHelper";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../theme";
import { useRouter } from "expo-router";
import {
  loadEcoCashPhone,
  loadPaynowSetup,
  loadSavedMethodChoice,
  PaynowSetupData,
  saveSavedMethodChoice,
  SAVED_METHOD_STRIPE_PREFIX
} from "../../helpers/givingGatewayPrefs";
import { givingListRowTitle, givingModalTitle, givingSectionHeading } from "./givingTypography";
import { DEFAULT_MOBILE_FUNDS } from "./fundDefaults";

/** Must match GivingApi `loadFundTotals` parsing in donation `notes`. */
const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";

function asFundsArray(input: unknown): FundInterface[] {
  if (Array.isArray(input)) return input as FundInterface[];
  if (!input) return [];
  if (typeof input === "string") {
    try {
      return asFundsArray(JSON.parse(input));
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

interface Props {
  paymentMethods: StripePaymentMethod[];
  customerId: string;
  gatewayData?: any[];
  publishKey?: string;
  updatedFunction: () => void;
  initialDonation?: {
    amount: string;
    fundId: string;
  };
  /** `membership` = monthly app subscription (same checkout as Giving recurring). */
  variant?: "giving" | "membership";
  /** From church `mobileSubscriptionMonthlyAmount` — pre-fills amount when empty. */
  membershipSuggestedAmount?: string;
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const TITHE_FUND_ICONS: Record<string, MaterialIconName> = {
  tithe: "percent",
  seed: "spa",
  offering: "card-giftcard"
};

function getTitheFundIcon(fundId: string): MaterialIconName {
  return TITHE_FUND_ICONS[fundId] ?? "volunteer-activism";
}

const OFFERING_FUND_ICONS: Record<string, MaterialIconName> = {
  "new-locations": "add-location-alt",
  "local-global-missions": "public",
  "nextgen": "child-care",
  "free-resources": "library-books"
};

function getOfferingFundIcon(fundId: string): MaterialIconName {
  return OFFERING_FUND_ICONS[fundId] ?? "volunteer-activism";
}

function toFundKey(value?: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFundDescription(name: string): string {
  const key = toFundKey(name);
  if (key.includes("tithe")) return "Give 10% of your earnings back to God as your tithe";
  if (key.includes("seed")) return "Sow a faith seed as a special act of worship and trust in God.";
  if (key.includes("offering")) return "Give an offering to support ministry outreach and kingdom impact.";
  if (key.includes("new-location") || key.includes("campus")) return "Fuel the effort to reach people who don't know Christ by helping launch new Machon HaRuach locations.";
  if (key.includes("mission")) return "Provide relief to people in crisis and help transform lives alongside mission partners in our communities and around the world.";
  if (key.includes("nextgen") || key.includes("next-generation") || key.includes("youth") || key.includes("children")) return "Invest in the next generation as we lead kids and youth to know who God is and who they are in Him.";
  if (key.includes("resource")) return "Support creating and sharing free ministry resources for churches and leaders around the world.";
  return "Support this ministry fund through your giving.";
}

const MOBILE_PREFERRED_GIVING_LABELS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Tithe", patterns: [/^tithe$/i, /\btith(e|es|ing)\b/i] },
  { label: "Seed", patterns: [/^seed$/i, /\bseed(s|ing)?\b/i, /\bfaith seed\b/i] },
  { label: "Offering", patterns: [/^offering$/i, /\boffering(s)?\b/i, /\bgeneral offering\b/i] },
  { label: "New Locations", patterns: [/\bnew location(s)?\b/i, /\bcampus expansion\b/i] },
  { label: "Local & Global Missions", patterns: [/\bmission(s)?\b/i, /\blocal.*global\b/i, /\bglobal.*local\b/i] },
  { label: "NextGen", patterns: [/\bnext ?gen\b/i, /\bnext generation\b/i, /\byouth\b/i, /\bchildren\b/i] },
  { label: "Free Resources", patterns: [/\bfree resource(s)?\b/i, /\bresource(s)?\b/i] }
];

function toPreferredGivingLabel(rawName?: string): string {
  const normalized = String(rawName || "").trim();
  if (!normalized) return "Fund";
  for (const entry of MOBILE_PREFERRED_GIVING_LABELS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) return entry.label;
  }
  return normalized;
}

const FUND_OPTION_ICON_SIZE = 24;
const FUND_OPTION_ICON_COLOR = "#FFFFFF";
const MEMBERSHIP_FIXED_MONTHLY_AMOUNT = 1;

export function EnhancedDonationForm({
  paymentMethods: pm,
  customerId,
  gatewayData,
  publishKey,
  updatedFunction,
  initialDonation,
  variant = "giving",
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const isMembership = variant === "membership";
  const membershipFeeAmount = CurrencyHelper.formatCurrency(MEMBERSHIP_FIXED_MONTHLY_AMOUNT);
  const [fundModalFontsLoaded] = useFonts({ Poppins_800ExtraBold });
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const isSmallPhone = minSide < 370;
  const isLargePhone = minSide >= 430;
  const fundModalDoneButtonHeight = isSmallPhone ? 50 : isLargePhone ? 58 : 54;
  const user = useUser();
  const currentUserChurch = useCurrentUserChurch();
  const person = currentUserChurch?.person;
  const prefsOwnerId = person?.id || user?.id || "";
  const selectedGivingCampusName = useEngagementStore((s) => s.selectedAttendanceCampusName);
  const amountInputRef = useRef<TextInput>(null);

  // Form state
  const [amount, setAmount] = useState<string>(initialDonation?.amount || "");
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [selectedFund, setSelectedFund] = useState<string>(initialDonation?.fundId || "");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [selectedInterval, setSelectedInterval] = useState<string>("one_month");
  const [coverFees, setCoverFees] = useState<boolean>(false);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [showComplete, setShowComplete] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<{ amount: string, isRecurring: boolean, interval: string, fundName: string }>({ amount: "", isRecurring: false, interval: "", fundName: "" });
  const [isGiving, setIsGiving] = useState(false);
  const [showGiveSuccessTick, setShowGiveSuccessTick] = useState(false);

  // Menu visibility
  const [showFundPicker, setShowFundPicker] = useState(false);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);

  // Guest user fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details>();
  const [openStartPicker, setOpenStartPicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());

  // Guest payment type (card, bank, EcoCash, or Paynow saved profile when applicable)
  const [guestPaymentType, setGuestPaymentType] = useState<"card" | "bank" | "ecocash" | "paynow">("card");
  /** Which saved method drives checkout when multiple exist (Stripe pm / Paynow / EcoCash). */
  const [givingRailKey, setGivingRailKey] = useState<string>("");
  const [bankConnecting, setBankConnecting] = useState(false);
  const [ecoCashMobileNumber, setEcoCashMobileNumber] = useState("");
  const [paynowSetup, setPaynowSetup] = useState<PaynowSetupData>({});

  // Church data for non-auth users
  const [churchData, setChurchData] = useState<any>(null);

  // Determine church ID for funds query
  const churchId = currentUserChurch?.church?.id || "";
  const primaryGateway = gatewayData && gatewayData.length > 0 ? gatewayData[0] : null;
  const primaryProvider = (primaryGateway?.provider || "").toLowerCase();
  const ecoCashGateway =
    (gatewayData || []).find(g => {
      const p = String(g?.provider || "").toLowerCase();
      return p === "ecocash" || p.includes("eco");
    }) || null;
  const canUseStripeCard = !!publishKey;
  const ecoCashEnabled =
    Array.isArray(gatewayData) &&
    gatewayData.some(g => {
      const p = String(g?.provider || "").toLowerCase();
      return p === "ecocash" || p.includes("eco");
    });

  const normalizeEcoCashPhone = (value: string) => {
    const digits = (value || "").replace(/\D/g, "");
    if (digits.startsWith("263") && digits.length >= 12) return `0${digits.slice(3, 12)}`;
    return digits.slice(0, 10);
  };

  const normalizeAmountInput = (value: string) => {
    const cleaned = (value || "").replace(/[^0-9.]/g, "");
    if (!cleaned) return "";
    const parts = cleaned.split(".");
    const whole = (parts[0] || "").replace(/^0+(?=\d)/, "");
    if (parts.length === 1) return whole;
    const decimal = parts.slice(1).join("").slice(0, 2);
    return `${whole || "0"}.${decimal}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!churchId || !prefsOwnerId) return;
      const saved = await loadEcoCashPhone(churchId, prefsOwnerId);
      if (!cancelled) setEcoCashMobileNumber(normalizeEcoCashPhone(saved || ""));
    })();
    return () => {
      cancelled = true;
    };
  }, [churchId, prefsOwnerId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!churchId || !prefsOwnerId) return;
        const saved = await loadEcoCashPhone(churchId, prefsOwnerId);
        if (!cancelled) setEcoCashMobileNumber(normalizeEcoCashPhone(saved || ""));
      })();
      return () => {
        cancelled = true;
      };
    }, [churchId, prefsOwnerId])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ownerId = person?.id || user?.id;
      if (!churchId || !ownerId) return;
      const saved = await loadPaynowSetup(churchId, ownerId);
      if (!cancelled) setPaynowSetup(saved || {});
    })();
    return () => {
      cancelled = true;
    };
  }, [churchId, person?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const ownerId = person?.id || user?.id;
        if (!churchId || !ownerId) return;
        const saved = await loadPaynowSetup(churchId, ownerId);
        if (!cancelled) setPaynowSetup(saved || {});
      })();
      return () => {
        cancelled = true;
      };
    }, [churchId, person?.id, user?.id])
  );

  const hasPaynowGateway = useMemo(
    () => Array.isArray(gatewayData) && gatewayData.some(g => String(g?.provider || "").toLowerCase() === "paynow"),
    [gatewayData]
  );
  const hasStripeGateway = useMemo(
    () => Array.isArray(gatewayData) && gatewayData.some(g => String(g?.provider || "").toLowerCase() === "stripe"),
    [gatewayData]
  );
  /** Resolved gateways — never rely on `gatewayData[0]` alone when churches have Stripe + EcoCash + Paynow. */
  const stripeGatewayModel = useMemo(
    () => (gatewayData || []).find(g => String(g?.provider || "").toLowerCase() === "stripe") || null,
    [gatewayData]
  );
  const paynowGatewayModel = useMemo(
    () => (gatewayData || []).find(g => String(g?.provider || "").toLowerCase() === "paynow") || null,
    [gatewayData]
  );
  const countryValue = String((churchData?.country || (currentUserChurch as any)?.church?.country || "")).trim().toLowerCase();
  const isZimbabweChurch = countryValue === "zimbabwe" || countryValue === "zw";
  const isZimbabwePaynowBranch = isZimbabweChurch || (hasPaynowGateway && !hasStripeGateway);
  const hasSavedPaynowCardInfo = !!(
    paynowSetup.cardName?.trim() ||
    paynowSetup.cardEmail?.trim() ||
    paynowSetup.cardPhone?.trim()
  );
  const showGivingSavedCard = hasPaynowGateway && hasSavedPaynowCardInfo;
  const hasSavedEcoCashNumber = /^07\d{8}$/.test((ecoCashMobileNumber || "").trim());
  const paynowCardNetwork = (paynowSetup.cardNetwork === "zimswitch" ? "zimswitch" : "vmc") as "vmc" | "zimswitch";

  const commitGivingSavedChoice = useCallback(
    (key: string) => {
      if (!key) return;
      setGivingRailKey(key);
      if (churchId && prefsOwnerId) {
        saveSavedMethodChoice(churchId, prefsOwnerId, key).catch(() => {});
      }
      if (key.startsWith(SAVED_METHOD_STRIPE_PREFIX)) {
        const id = key.slice(SAVED_METHOD_STRIPE_PREFIX.length);
        const method = pm.find(m => m.id === id);
        if (method) {
          setGuestPaymentType(String(method.type || "").toLowerCase() === "us_bank_account" ? "bank" : "card");
          setSelectedMethod(id);
        }
        return;
      }
      if (key === "ecocash") {
        setGuestPaymentType("ecocash");
        setIsRecurring(false);
        return;
      }
      if (key === "paynow") {
        setGuestPaymentType("paynow");
      }
    },
    [churchId, prefsOwnerId, pm]
  );

  const runGivingSavedChoiceSync = useCallback(async () => {
    if (!churchId || !prefsOwnerId) return;
    try {
      const stored = await loadSavedMethodChoice(churchId, prefsOwnerId);
      let ecocashPhoneOk = /^07\d{8}$/.test((ecoCashMobileNumber || "").trim());
      if (stored === "ecocash" && !ecocashPhoneOk) {
        const raw = await loadEcoCashPhone(churchId, prefsOwnerId);
        const normalized = normalizeEcoCashPhone(raw || "");
        ecocashPhoneOk = /^07\d{8}$/.test(normalized);
        if (ecocashPhoneOk && normalized !== (ecoCashMobileNumber || "").trim()) {
          setEcoCashMobileNumber(normalized);
        }
      }
      const stripeIds = new Set(pm.map(m => String(m.id || "").trim()).filter(Boolean));
      const validKey = (k: string) => {
        if (!k) return false;
        if (k.startsWith(SAVED_METHOD_STRIPE_PREFIX)) return stripeIds.has(k.slice(SAVED_METHOD_STRIPE_PREFIX.length));
        if (k === "paynow") return hasPaynowGateway && showGivingSavedCard;
        if (k === "ecocash") return ecocashPhoneOk;
        return false;
      };

      let next = "";
      if (validKey(stored)) next = stored;
      else {
        if (primaryProvider === "paynow" && hasPaynowGateway && showGivingSavedCard) next = "paynow";
        else if (pm[0]?.id) next = `${SAVED_METHOD_STRIPE_PREFIX}${pm[0].id}`;
        else if (ecocashPhoneOk) next = "ecocash";
        else if (hasPaynowGateway && showGivingSavedCard) next = "paynow";

        if (next && next !== stored) {
          await saveSavedMethodChoice(churchId, prefsOwnerId, next).catch(() => {});
        }
      }

      if (next) commitGivingSavedChoice(next);
    } catch {
      //
    }
  }, [
    churchId,
    prefsOwnerId,
    pm,
    hasPaynowGateway,
    showGivingSavedCard,
    ecoCashMobileNumber,
    primaryProvider,
    commitGivingSavedChoice
  ]);

  useEffect(() => {
    runGivingSavedChoiceSync();
  }, [runGivingSavedChoiceSync]);

  useFocusEffect(
    useCallback(() => {
      runGivingSavedChoiceSync();
      return undefined;
    }, [runGivingSavedChoiceSync])
  );

  const bankIcon = require("../../assets/images/bank.png");
  const ecoCashLogo = require("../../assets/images/ecocash-seeklogo.png");
  const visaMastercardLogo = require("../../assets/images/visamastercard.png");
  const zimswitchLogo = require("../../assets/images/zimswitch.png");

  // Load funds: anonymous church-scoped route first (guests), then JWT /funds like Admin DonationBatchPage.
  const { data: apiFunds = [] } = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi", churchId || ""],
    enabled: !!churchId,
    queryFn: async () => {
      if (!churchId) return [];
      try {
        const byChurch = asFundsArray(await ApiHelper.get(`/funds/churchId/${churchId}`, "GivingApi"));
        if (byChurch.length > 0) return byChurch;
      } catch {
        // try /funds below
      }
      try {
        return asFundsArray(await ApiHelper.get("/funds", "GivingApi"));
      } catch {
        return [];
      }
    },
    placeholderData: [],
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });
  const funds = useMemo<FundInterface[]>(() => (apiFunds.length > 0 ? apiFunds : DEFAULT_MOBILE_FUNDS), [apiFunds]);

  // Fetch church data for non-auth users (similar to AppHelper)
  useEffect(() => {
    if (churchId && !churchData) {
      ApiHelper.get("/churches/" + churchId, "MembershipApi").then((data: any) => {
        setChurchData(data);
      }).catch((error: any) => {
        console.error("Failed to fetch church data:", error);
      });
    }
  }, [churchId, churchData]);

  const fundOptions = useMemo(() => {
    return (funds || []).map((fund) => {
      const key = toFundKey(fund.name || fund.id);
      const displayName = toPreferredGivingLabel(fund.name || "");
      const section: "tithe" | "offerings" = /(tithe|seed|offering)/i.test(fund.name || "") ? "tithe" : "offerings";
      return {
        id: fund.id || "",
        key,
        name: displayName,
        description: getFundDescription(fund.name || ""),
        section
      };
    }).filter((f) => !!f.id);
  }, [funds]);

  useEffect(() => {
    if (!isMembership) return;
    setIsRecurring(true);
    setSelectedInterval("one_month");
  }, [isMembership]);

  useEffect(() => {
    if (!isMembership) return;
    setAmount(String(MEMBERSHIP_FIXED_MONTHLY_AMOUNT));
  }, [isMembership]);

  // Initialize defaults
  useEffect(() => {
    if (fundOptions.length === 0) return;
    const exists = fundOptions.some((f) => f.id === selectedFund);
    if (!selectedFund || !exists) {
      if (isMembership) {
        const match = fundOptions.find(
          f =>
            /subscription|membership|mobile|app/i.test(f.name || "") ||
            /subscription|membership|mobile/i.test(f.key || "")
        );
        setSelectedFund(match?.id || fundOptions[0].id);
      } else {
        setSelectedFund(fundOptions[0].id);
      }
    }
  }, [fundOptions, selectedFund, isMembership]);

  // Calculate transaction fee when amount or payment method changes
  useEffect(() => {
    const calculateFee = async () => {
      const amountNumber = parseFloat(amount || "0");
      if (amountNumber > 0) {
        // Calculate fee even if selectedMethod is empty (for non-auth users)
        const fee = await getTransactionFee(amountNumber);
        setTransactionFee(fee);
      } else {
        setTransactionFee(0);
      }
    };
    calculateFee();
  }, [amount, selectedMethod]);

  const intervalTypes = [
    { label: t("donations.weekly"), value: "one_week" },
    { label: t("donations.monthly"), value: "one_month" },
    { label: t("donations.quarterly"), value: "three_month" },
    { label: t("donations.annually"), value: "one_year" }
  ];

  const calculateTotal = () => {
    const baseAmount = isMembership ? MEMBERSHIP_FIXED_MONTHLY_AMOUNT : parseFloat(amount || "0");
    if (coverFees && baseAmount > 0) {
      return baseAmount + transactionFee;
    }
    return baseAmount;
  };

  const getTransactionFee = async (amount: number) => {
    if (amount > 0) {
      const selectedPaymentMethod = pm.find(p => p.id === selectedMethod);
      const requestData: any = { amount };

      if (selectedPaymentMethod?.type === "paypal") {
        requestData.provider = "paypal";
      } else {
        // For non-auth users or when no payment method is selected, default to creditCard
        const dt = selectedPaymentMethod?.type === "card" ? "creditCard" :
          selectedPaymentMethod?.type === "bank" ? "ach" :
            "creditCard"; // Default for non-auth users
        requestData.type = dt;
      }

      try {
        const response = await ApiHelper.post("/donate/fee?churchId=" + churchId, requestData, "GivingApi");
        return response.calculatedFee;
      } catch (error) {
        // Fallback to credit card calculation
        const fixedFee = 0.3;
        const fixedPercent = 0.029;
        return Math.round(((amount + fixedFee) / (1 - fixedPercent) - amount) * 100) / 100;
      }
    } else {
      return 0;
    }
  };

  const getMethodLabel = (method: StripePaymentMethod) => {
    if (!method) return t("donations.selectPaymentMethod");
    return `${method.name} ${t("donations.endingIn")} ${method.last4}`;
  };
  const getFirstMethodByType = (type: "bank" | "card") => pm.find(m => (m.type || "").toLowerCase() === type);
  const handleQuickMethodSelect = (type: "bank" | "card" | "ecocash") => {
    if (type === "ecocash") {
      if (isMembership) {
        Alert.alert(t("common.alert"), t("subscription.membershipEcoCashUnsupported"));
        return;
      }
      if (!ecoCashEnabled) {
        Alert.alert(t("common.error"), "EcoCash is not available for this church yet.");
        return;
      }
      commitGivingSavedChoice("ecocash");
      return;
    }
    const matched = getFirstMethodByType(type);
    if (matched?.id) {
      commitGivingSavedChoice(`${SAVED_METHOD_STRIPE_PREFIX}${matched.id}`);
      if (!currentUserChurch?.person?.id && type === "bank") setIsRecurring(false);
      return;
    }
    setGuestPaymentType(type);
    if (!currentUserChurch?.person?.id && type === "bank") setIsRecurring(false);
  };
  const isQuickMethodActive = (type: "bank" | "card" | "ecocash") => {
    if (type === "ecocash") return guestPaymentType === "ecocash";
    if (guestPaymentType === type) return true;
    const selected = pm.find(m => m.id === selectedMethod);
    return (selected?.type || "").toLowerCase() === type;
  };

  const getFundLabel = (fundId: string) => {
    if (!fundId) return "Fund";
    const fromApi = funds.find(f => f.id === fundId);
    if (fromApi?.name) return toPreferredGivingLabel(fromApi.name);
    const fromStatic = fundOptions.find(f => f.id === fundId);
    if (fromStatic?.name) return fromStatic.name;
    return "Fund";
  };

  const getIntervalLabel = (value: string) => {
    const interval = intervalTypes.find(i => i.value === value);
    return interval ? interval.label : t("donations.monthly");
  };

  const handleGive = async () => {
    if (isGiving) return;
    try {
      if (isMembership && guestPaymentType === "ecocash") {
        Alert.alert(t("common.alert"), t("subscription.membershipEcoCashUnsupported"));
        return;
      }

      const donationAmount = parseFloat(amount);
      const resolvedDonationAmount = isMembership ? MEMBERSHIP_FIXED_MONTHLY_AMOUNT : donationAmount;
      const effectiveSelectedMethodId = selectedMethod || pm[0]?.id || "";
      const effectiveSelectedMethod = pm.find(p => p.id === effectiveSelectedMethodId);

      if (!resolvedDonationAmount || resolvedDonationAmount < 0.5) {
        Alert.alert(t("common.alert"), t("donations.minAmount"));
        return;
      }

      const effectiveFundId = selectedFund || funds[0]?.id || "";
      if (!effectiveFundId) {
        Alert.alert(t("common.alert"), t("donations.selectFund"));
        return;
      }

      const catalogFundIds = new Set((apiFunds || []).map((f) => String(f.id || "").trim()).filter(Boolean));
      if (catalogFundIds.size > 0 && !catalogFundIds.has(String(effectiveFundId).trim())) {
        Alert.alert(
          t("common.alert"),
          "This fund is not linked to your church's giving setup. Please pick another fund or contact your administrator."
        );
        return;
      }

      setShowGiveSuccessTick(false);
      setIsGiving(true);

      const total = calculateTotal();
      const selectedFundObj = funds.find(f => f.id === effectiveFundId);
      let resolvedPersonId = person?.id || "";
      let resolvedEmail = person ? user?.email || "" : email;
      let resolvedName = person ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() : `${firstName} ${lastName}`.trim();

      // Ensure donations (including EcoCash) are linked to a person so they appear in /donations/my history.
      if (!resolvedPersonId && user?.email && churchId) {
        try {
          const ensuredPerson = await ApiHelper.post("/people/loadOrCreate", {
            churchId,
            firstName: user?.firstName || firstName,
            lastName: user?.lastName || lastName,
            email: user.email
          }, "MembershipApi");
          resolvedPersonId = ensuredPerson?.id || "";
          resolvedEmail = user.email;
          resolvedName = `${user?.firstName || firstName || ""} ${user?.lastName || lastName || ""}`.trim();
        } catch (ensureErr) {
          // If person resolution fails, keep existing flow and let backend validation surface any issue.
        }
      }

      const campusTag = (selectedGivingCampusName || "").trim();
      const givingNotes = campusTag ? `${GIVING_CAMPUS_NOTE_PREFIX}${campusTag}` : "";

      const donation: StripeDonationInterface = {
        id: effectiveSelectedMethodId,
        type: effectiveSelectedMethod?.type || "card",
        customerId: customerId,
        person: {
          id: resolvedPersonId,
          email: resolvedEmail,
          name: resolvedName
        },
        amount: total,
        funds: [
          {
            id: effectiveFundId,
            amount: resolvedDonationAmount,
            name: toPreferredGivingLabel(selectedFundObj?.name || getFundLabel(effectiveFundId))
          }
        ],
        billing_cycle_anchor: Number(startDate) || +new Date(),
        interval: isRecurring
          ? {
            interval_count: getIntervalCount(selectedInterval),
            interval: getIntervalType(selectedInterval)
          }
          : undefined,
        church: { subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain || "" },
        notes: givingNotes
      };

      const shouldAutoUseEcoCash =
        ecoCashEnabled &&
        !canUseStripeCard &&
        !!ecoCashMobileNumber.trim() &&
        guestPaymentType !== "bank" &&
        guestPaymentType !== "paynow";

      const ecocashPhoneValid = /^07\d{8}$/.test((ecoCashMobileNumber || "").trim());

      // Authenticated: explicit EcoCash rail must charge EcoCash even when `ecoCashEnabled` is false
      // (e.g. Zimbabwe UI + saved number but gateways list ordering / provider string mismatch).
      const ecocashForDonate =
        !!ecoCashGateway?.id &&
        ecocashPhoneValid &&
        (
          (!resolvedPersonId && ecoCashEnabled && (guestPaymentType === "ecocash" || shouldAutoUseEcoCash)) ||
          (!!resolvedPersonId && (givingRailKey === "ecocash" || shouldAutoUseEcoCash))
        );

      const stripeRailSelected = givingRailKey.startsWith(SAVED_METHOD_STRIPE_PREFIX);
      // Do not treat empty `givingRailKey` as Paynow when Stripe saved cards exist (race before prefs sync).
      const usePaynowGiving =
        hasPaynowGateway &&
        !ecocashForDonate &&
        (givingRailKey === "paynow" ||
          (primaryProvider === "paynow" &&
            !stripeRailSelected &&
            givingRailKey !== "ecocash" &&
            pm.length === 0));

      if (
        resolvedPersonId &&
        !ecocashForDonate &&
        !usePaynowGiving &&
        stripeRailSelected &&
        !effectiveSelectedMethodId
      ) {
        Alert.alert(t("common.alert"), t("donations.selectPaymentMethod"));
        return;
      }

      // EcoCash is one-time only in this phase
      if (ecocashForDonate) {
        if (!ecoCashMobileNumber.trim()) {
          Alert.alert(t("common.alert"), "EcoCash mobile number is required");
          return;
        }
        donation.type = "ecocash" as any;
        (donation as any).id = `GNW-${Date.now()}`; // sourceReference
        (donation as any).reference = (donation as any).id;
        (donation as any).mobileNumber = ecoCashMobileNumber.trim();
        setIsRecurring(false);
      } else if (resolvedPersonId && givingRailKey === "ecocash") {
        if (!ecoCashGateway?.id) {
          Alert.alert(t("common.error"), "EcoCash gateway is not configured for this church.");
          return;
        }
        if (!ecocashPhoneValid) {
          Alert.alert(t("common.alert"), "EcoCash mobile number is required");
          return;
        }
      }

      if (usePaynowGiving) {
        const paynowGwId = paynowGatewayModel?.id || primaryGateway?.id;
        if (isRecurring) {
          Alert.alert(
            t("common.alert"),
            "Recurring Paynow payments are coming soon. Please use One Time for now."
          );
          return;
        }

        const preferredMethod = paynowSetup.preferredMethod || "card";
        const paynowCardMethod = paynowSetup.cardNetwork || "vmc";
        const paynowName = preferredMethod === "bank"
          ? paynowSetup.bankAccountName?.trim() || resolvedName
          : paynowSetup.cardName?.trim() || resolvedName;
        const paynowEmail = preferredMethod === "bank"
          ? paynowSetup.bankEmail?.trim() || resolvedEmail
          : paynowSetup.cardEmail?.trim() || resolvedEmail;
        const paynowPhone = preferredMethod === "bank"
          ? paynowSetup.bankPhone?.trim()
          : paynowSetup.cardPhone?.trim();

        if (!paynowName || !paynowEmail) {
          Alert.alert(t("common.alert"), "Complete your Paynow details under Payment Method before giving.");
          return;
        }

        const paynowReference = ((donation as any)?.id || `PN-${Date.now()}`).toString();
        const paynowLinkPayload = {
          ...donation,
          // Keep selected Paynow payment method for backend metadata logging.
          type: preferredMethod === "card" ? paynowCardMethod : preferredMethod,
          method: preferredMethod === "card" ? paynowCardMethod : preferredMethod,
          tokenize: preferredMethod === "card",
          reference: paynowReference,
          gatewayId: paynowGwId,
          churchId,
          notes: (donation.notes || "").toString(),
          currency: (primaryGateway as any)?.currency || "usd",
          person: {
            ...donation.person,
            name: paynowName,
            email: paynowEmail
          },
          ...(paynowPhone ? { authphone: paynowPhone, mobileNumber: paynowPhone } : {}),
          church: {
            name: churchData?.name || currentUserChurch?.church?.name,
            subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain,
            churchURL: `https://${churchData?.subDomain || currentUserChurch?.church?.subDomain}.staging.machonharuach.org`
          }
        };

        const isPaynowCardMethod = preferredMethod === "card";
        if (isPaynowCardMethod && person?.id) {
          try {
            const expressResponse = await ApiHelper.post("/donate/paynow/express/charge", {
              ...paynowLinkPayload,
              personId: person.id,
              method: paynowCardMethod
            }, "GivingApi");

            if (expressResponse?.pollUrl && !expressResponse?.browserUrl) {
              const statusResult = await ApiHelper.post("/donate/paynow/status", {
                pollUrl: expressResponse.pollUrl,
                gatewayId: paynowGwId,
                churchId,
                personId: person.id,
                method: paynowCardMethod,
                reference: expressResponse.reference || paynowReference
              }, "GivingApi");
              const status = String(statusResult?.status || statusResult?.Status || "").toLowerCase();
              const paidLike = status.includes("paid") || status.includes("delivered") || status.includes("awaiting delivery") || status.includes("success");
              if (paidLike) {
                setCompletionData({
                  amount: CurrencyHelper.formatCurrency(calculateTotal()),
                  isRecurring,
                  interval: selectedInterval,
                  fundName: selectedFundObj?.name || getFundLabel(effectiveFundId)
                });
                setAmount("");
                setIsRecurring(false);
                setCoverFees(false);
                setEmail("");
                setFirstName("");
                setLastName("");
                setEcoCashMobileNumber("");
                setShowComplete(true);
                return;
              }
              Alert.alert(t("common.alert"), "Paynow payment started. Please approve on your provider and tap Give again to refresh status.");
              return;
            }

            if (expressResponse?.browserUrl && expressResponse?.pollUrl) {
              router.push({
                pathname: "/(drawer)/paynowCheckout",
                params: {
                  browserUrl: String(expressResponse.browserUrl),
                  pollUrl: String(expressResponse.pollUrl),
                  gatewayId: String(paynowGwId || ""),
                  churchId: String(churchId || ""),
                  personId: String(person?.id || ""),
                  method: String(paynowCardMethod),
                  amount: CurrencyHelper.formatCurrency(calculateTotal()),
                  isRecurring: String(!!isRecurring),
                  interval: String(selectedInterval || "")
                }
              } as any);
              return;
            }
          } catch (expressErr: any) {
            const expressErrText = String(expressErr?.message || expressErr || "").toLowerCase();
            const noToken = expressErrText.includes("no_saved_paynow_token") || expressErrText.includes("no saved paynow token");
            if (!noToken) {
              // For non-token errors, continue to Payment Link fallback to keep giving unblocked.
            }
          }
        }

        try {
          let paynowLink: any;
          try {
            paynowLink = await ApiHelper.post("/donate/paynow/link", paynowLinkPayload as any, "GivingApi");
          } catch (linkErr: any) {
            const linkErrText = String(linkErr?.message || linkErr || "").toLowerCase();
            const tokenizeNotPermitted =
              linkErrText.includes("not permitted to tokenize") ||
              linkErrText.includes("not+permitted+to+tokenize");
            if (!tokenizeNotPermitted) throw linkErr;
            // Fallback when merchant account is not tokenization-enabled yet.
            paynowLink = await ApiHelper.post("/donate/paynow/link", {
              ...paynowLinkPayload,
              tokenize: false
            } as any, "GivingApi");
          }
          if (!paynowLink?.browserUrl || !paynowLink?.pollUrl) {
            throw new Error("Paynow payment link is not available at the moment.");
          }
          router.push({
            pathname: "/(drawer)/paynowCheckout",
            params: {
              browserUrl: String(paynowLink.browserUrl),
              pollUrl: String(paynowLink.pollUrl),
              gatewayId: String(paynowGwId || ""),
              churchId: String(churchId || ""),
              personId: String(person?.id || ""),
              method: String(preferredMethod === "card" ? paynowCardMethod : preferredMethod),
              amount: CurrencyHelper.formatCurrency(calculateTotal()),
              isRecurring: String(!!isRecurring),
              interval: String(selectedInterval || "")
            }
          } as any);
        } catch (err: any) {
          const errText = String(err?.message || err || "").toLowerCase();
          const isMissingLinkEndpoint = errText.includes("/giving/donate/paynow/link") || errText.includes("endpoint not found") || errText.includes("status\":404");
          if (!isMissingLinkEndpoint) throw err;
          // Backward compatibility: if API is not redeployed yet, continue with legacy charge flow.
          await makeDonation(paynowLinkPayload as any);
        }
        return;
      }


      if (!resolvedPersonId) {
        // Guest user - route based on payment type
        if (ecocashForDonate) {
          if (!ecoCashGateway?.id) {
            Alert.alert(t("common.error"), "EcoCash gateway is not configured for this church.");
            return;
          }
          await makeDonation({
            ...donation,
            gatewayId: ecoCashGateway.id,
            churchId,
            notes: (donation.notes || "").toString(),
            church: {
              name: churchData?.name,
              subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain,
              churchURL: `https://${churchData?.subDomain || currentUserChurch?.church?.subDomain}.staging.machonharuach.org`
            }
          } as any);
        } else if (guestPaymentType === "bank") {
          await handleGuestBankDonation(donation);
        } else {
          if (!canUseStripeCard) {
            Alert.alert(t("common.error"), "Secure payment is still initializing. Please try again in a moment.");
            return;
          }
          await handleGuestDonation(donation);
        }
      } else {
        // For authenticated users, add gatewayId and other required fields
        const donationProvider = String((donation as any).type || "").toLowerCase();
        if (donationProvider === "ecocash" && !ecoCashGateway?.id) {
          Alert.alert(t("common.error"), "EcoCash gateway is not configured for this church.");
          return;
        }
        const gatewayForCharge =
          donationProvider === "ecocash"
            ? ecoCashGateway
            : stripeGatewayModel || primaryGateway;
        const enhancedDonation = {
          ...donation,
          gatewayId: gatewayForCharge?.id,
          churchId: churchId,
          notes: (donation.notes || "").toString(),
          church: {
            name: churchData?.name || currentUserChurch?.church?.name,
            subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain,
            churchURL: `https://${churchData?.subDomain || currentUserChurch?.church?.subDomain}.staging.machonharuach.org`
          }
        };
        await makeDonation(enhancedDonation);
      }
    } catch (error: any) {
      console.error("Donation error:", error);
      setShowGiveSuccessTick(false);
      const rawMsg = String(error?.message || "");
      let displayMessage = t("donations.failed");
      try {
        const jsonStart = rawMsg.indexOf("{");
        const jsonPayload = jsonStart >= 0 ? rawMsg.slice(jsonStart) : rawMsg;
        const parsed = jsonPayload.startsWith("{") ? JSON.parse(jsonPayload) : null;
        displayMessage = parsed?.error || parsed?.errors?.[0] || rawMsg || displayMessage;
      } catch {
        displayMessage = rawMsg || displayMessage;
      }
      Alert.alert(t("common.error"), displayMessage);
    } finally {
      setIsGiving(false);
    }
  };

  const getIntervalCount = (interval: string) => {
    switch (interval) {
      case "one_week": return 1;
      case "one_month": return 1;
      case "three_month": return 3;
      case "one_year": return 1;
      default: return 1;
    }
  };

  const getIntervalType = (interval: string) => {
    switch (interval) {
      case "one_week": return "week";
      case "one_month": return "month";
      case "three_month": return "month";
      case "one_year": return "year";
      default: return "month";
    }
  };

  const handleGuestDonation = async (donation: StripeDonationInterface) => {
    // Create user and person first
    await ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi");

    const personData = { churchId: churchId, firstName, lastName, email };
    const personResult = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");

    // Create payment method
    const stripePaymentMethod = await createPaymentMethod({ paymentMethodType: "Card", ...cardDetails });

    if (stripePaymentMethod.error) {
      throw new Error(stripePaymentMethod.error.message);
    }

    // Call addcard to get customerId (like AppHelper does)
    const pm = {
      id: stripePaymentMethod.paymentMethod.id,
      personId: personResult.id,
      email: email,
      name: `${firstName} ${lastName}`,
      churchId: churchId,
      provider: "stripe",
      ...(stripeGatewayModel?.id ? { gatewayId: stripeGatewayModel.id } : {})
    };

    const result = await ApiHelper.post("/paymentmethods/addcard", pm, "GivingApi");

    if (result?.raw?.message) {
      throw new Error(result.raw.message);
    }


    // Create donation object with data from addcard response
    const updatedDonation = {
      amount: donation.amount,
      id: result.paymentMethod?.id || "",
      customerId: result.customerId || "",
      type: result.paymentMethod?.type || "card",
      gatewayId: stripeGatewayModel?.id,
      churchId: churchId,
      person: {
        id: personResult.id,
        email: email,
        name: `${firstName} ${lastName}`
      },
      notes: (donation.notes || "").toString(),
      funds: donation.funds || [],
      billing_cycle_anchor: donation.billing_cycle_anchor,
      interval: donation.interval,
      church: {
        name: churchData?.name || currentUserChurch?.church?.name,
        subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain,
        churchURL: `https://${churchData?.subDomain || currentUserChurch?.church?.subDomain}.staging.machonharuach.org`
      }
    };

    await makeDonation(updatedDonation);
  };

  const handleGuestBankDonation = async (donation: StripeDonationInterface) => {
    setBankConnecting(true);

    try {
      // Create user and person first
      await ApiHelper.post("/users/loadOrCreate", { userEmail: email, firstName, lastName }, "MembershipApi");

      const personData = { churchId: churchId, firstName, lastName, email };
      const personResult = await ApiHelper.post("/people/loadOrCreate", personData, "MembershipApi");

      // Get ACH setup intent from anonymous endpoint
      const setupResponse = await ApiHelper.postAnonymous("/paymentmethods/ach-setup-intent-anon", {
        email,
        name: `${firstName} ${lastName}`,
        churchId: churchId,
        gatewayId: stripeGatewayModel?.id,
        provider: "stripe"
      }, "GivingApi");

      if (setupResponse?.error) {
        throw new Error(setupResponse.error);
      }

      // Use Financial Connections to collect bank account
      const { setupIntent: collectedSetupIntent, error: collectError } = await collectBankAccountForSetup(
        setupResponse.clientSecret,
        {
          paymentMethodType: "USBankAccount",
          paymentMethodData: {
            billingDetails: {
              name: `${firstName} ${lastName}`,
              email
            }
          }
        }
      );

      if (collectError) {
        throw new Error(collectError.message || "Failed to connect bank account");
      }

      // Check if user completed the flow
      if (!collectedSetupIntent?.paymentMethod?.id) {
        throw new Error("Bank account connection was not completed. Please try again.");
      }

      // Confirm the SetupIntent
      const { setupIntent: confirmedIntent, error: confirmError } = await confirmSetupIntent(
        setupResponse.clientSecret,
        { paymentMethodType: "USBankAccount" }
      );

      if (confirmError) {
        throw new Error(confirmError.message || "Failed to confirm bank account");
      }

      setBankConnecting(false);

      // Process the donation - use paymentMethod.id (paymentMethodId is deprecated)
      const updatedDonation = {
        amount: donation.amount,
        id: confirmedIntent?.paymentMethod?.id || collectedSetupIntent?.paymentMethod?.id || "",
        customerId: setupResponse.customerId,
        type: "bank",
        gatewayId: gateway?.id,
        churchId: churchId,
        person: {
          id: personResult.id,
          email: email,
          name: `${firstName} ${lastName}`
        },
        notes: (donation.notes || "").toString(),
        funds: donation.funds || [],
        church: {
          name: churchData?.name || currentUserChurch?.church?.name,
          subDomain: churchData?.subDomain || currentUserChurch?.church?.subDomain,
          churchURL: `https://${churchData?.subDomain || currentUserChurch?.church?.subDomain}.staging.machonharuach.org`
        }
      };

      await makeDonation(updatedDonation);
    } catch (error: any) {
      setBankConnecting(false);
      throw error;
    }
  };

  const makeDonation = async (donation: StripeDonationInterface) => {
    const endpoint = isRecurring ? "/donate/subscribe/" : "/donate/charge/";
    const result = await ApiHelper.post(endpoint, donation, "GivingApi");
    const completionFundName = (() => {
      const firstFund = (donation as any)?.funds?.[0];
      const explicitName = (firstFund?.name || "").toString().trim();
      if (explicitName) return explicitName;
      const fundId = (firstFund?.id || "").toString();
      return getFundLabel(fundId);
    })();

    // Paynow redirect + polling: open in-app WebView to complete approval
    if ((result?.provider || "").toLowerCase() === "paynow" && result?.browserUrl && result?.pollUrl) {
      router.push({
        pathname: "/(drawer)/paynowCheckout",
        params: {
          browserUrl: String(result.browserUrl),
          pollUrl: String(result.pollUrl),
          gatewayId: String((donation as any)?.gatewayId || ""),
          churchId: String(churchId || ""),
          amount: CurrencyHelper.formatCurrency(calculateTotal()),
          isRecurring: String(!!isRecurring),
          interval: String(selectedInterval || "")
        }
      } as any);
      return;
    }

    // EcoCash polling: backend returns ecoCashNormalizedStatus (success|failed|pending).
    // Fallback heuristics remain for older API builds.
    if ((result?.provider || "").toLowerCase() === "ecocash" && result?.reference && (donation as any)?.mobileNumber) {
      const reference = result.reference;
      const mobileNumber = (donation as any).mobileNumber;
      const maxAttempts = 30; // ~90 seconds at 3s intervals
      const toText = (value: any): string => String(value || "").trim().toLowerCase();
      const isSuccessStatus = (statusText: string): boolean =>
        statusText.includes("success") ||
        statusText.includes("succeeded") ||
        statusText.includes("successful") ||
        statusText.includes("completed") ||
        statusText.includes("complete") ||
        statusText.includes("approved") ||
        statusText.includes("paid") ||
        statusText === "ok";
      const isFailureStatus = (statusText: string): boolean =>
        /\b(failed|failure|declined|rejected|cancelled|canceled|voided|void)\b/i.test(statusText);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusResult = await ApiHelper.post("/donate/ecocash/status", {
          gatewayId: (donation as any).gatewayId,
          churchId,
          mobileNumber,
          reference
        }, "GivingApi");

        const normalized = toText((statusResult as any)?.ecoCashNormalizedStatus);
        if (normalized === "success") break;
        if (normalized === "failed") {
          throw new Error("EcoCash payment was not approved. Please check your phone prompt and try again.");
        }

        const nested = (statusResult as any)?.data ?? {};
        const statusCandidates = [
          statusResult?.status,
          statusResult?.transactionStatus,
          statusResult?.paymentStatus,
          statusResult?.result,
          nested?.status,
          nested?.transactionStatus,
          nested?.paymentStatus,
          nested?.state
        ].map(toText).filter(Boolean);

        const combinedStatus = [normalized || "pending", ...statusCandidates].filter(Boolean).join(" ");
        const resultCode = toText(
          statusResult?.code ||
            statusResult?.statusCode ||
            statusResult?.resultCode ||
            nested?.code ||
            nested?.statusCode ||
            nested?.resultCode
        );

        if (statusCandidates.some(isSuccessStatus) || resultCode === "000" || resultCode === "00") break;
        if (statusCandidates.some(isFailureStatus)) {
          throw new Error("EcoCash payment was not approved. Please check your phone prompt and try again.");
        }

        if (attempt === maxAttempts - 1) {
          throw new Error(`EcoCash payment not confirmed yet. Last status: ${combinedStatus || "pending"}. Please check your phone prompt and try again.`);
        }
      }
    }

    if (result?.status === "succeeded" || result?.status === "pending" || result?.status === "active" || (result?.provider || "").toLowerCase() === "ecocash") {
      // Store completion data
      setCompletionData({
        amount: CurrencyHelper.formatCurrency(calculateTotal()),
        isRecurring: isRecurring,
        interval: selectedInterval,
        fundName: donation?.funds?.[0]?.name || getFundLabel(selectedFund || funds[0]?.id || "")
      });

      // Reset form
      setAmount("");
      setIsRecurring(false);
      setCoverFees(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setEcoCashMobileNumber("");

      // Show completion screen
      setIsGiving(false);
      setShowGiveSuccessTick(true);
      await new Promise((resolve) => setTimeout(resolve, 650));
      setShowComplete(true);
    } else if (result?.raw?.message) {
      throw new Error(result.raw.message);
    }
  };

  if (showComplete) {
    return (
      <DonationComplete
        variant={isMembership ? "membership" : "giving"}
        amount={completionData.amount}
        isRecurring={completionData.isRecurring}
        interval={completionData.interval}
        fundName={completionData.fundName}
        onDone={() => {
          setShowGiveSuccessTick(false);
          setShowComplete(false);
          updatedFunction();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Amount Input (hidden for membership: fixed $1 monthly) */}
      {!isMembership ? (
        <Card style={[styles.amountCard, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }]}>
          <Card.Content style={styles.amountCardContent}>
            <View style={styles.amountRow}>
              <View style={styles.amountInputWrap}>
                <View style={styles.amountInputRow}>
                  <TouchableOpacity activeOpacity={1} onPress={() => amountInputRef.current?.focus()} accessibilityRole="button" accessibilityLabel="Focus amount">
                    <Text style={[styles.dollarSign, { color: "#FFFFFF" }]}>$</Text>
                  </TouchableOpacity>
                  <TextInput
                    ref={amountInputRef}
                    value={amount}
                    onChangeText={(v) => setAmount(normalizeAmountInput(v))}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    underlineColorAndroid="transparent"
                    selectionColor="rgba(255,255,255,0.9)"
                    cursorColor="#FFFFFF"
                    editable
                    showSoftInputOnFocus
                    autoCorrect={false}
                    autoCapitalize="none"
                    importantForAutofill="no"
                    style={styles.amountNativeInput}
                    onFocus={() => { if (amount === "0.00" || amount === "0" || parseFloat(amount || "0") === 0) setAmount(""); }}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.amountFundPill} onPress={() => setShowFundPicker(true)}>
                <Text style={styles.amountFundPillText} numberOfLines={1}>
                  {getFundLabel(selectedFund) || "Fund"}
                </Text>
                <MaterialIcons name="expand-more" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {/* Guest details and Fund selectors intentionally hidden per latest design request */}

      {/* Recurring Toggle - Hidden for guest bank payments (one-time only); membership is always monthly */}
      {!((!currentUserChurch?.person?.id) && guestPaymentType === "bank") && (
        <Card style={[styles.sectionCard, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }]}>
          <Card.Content>
            {isMembership ? (
              <View style={styles.switchRow}>
                <View style={styles.recurringTextBlock} accessibilityRole="text" accessibilityLabel={t("subscription.membershipRecurringHeading")}>
                  <View style={[styles.recurringAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.recurringCopy}>
                    <Text style={styles.recurringCardHeading}>{t("subscription.membershipRecurringHeading")}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 4, fontWeight: "600" }}>
                      {t("subscription.membershipRecurringSub")}
                    </Text>
                    <Text style={styles.membershipFeeText}>
                      {t("subscription.membershipRecurringFee", { amount: membershipFeeAmount })}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.switchRow}>
                <View style={styles.recurringTextBlock} accessibilityRole="text" accessibilityLabel={t("donations.makeGiftRecurring")}>
                  <View style={[styles.recurringAccent, { backgroundColor: colors.primary }]} />
                  <View style={styles.recurringCopy}>
                    <Text style={styles.recurringCardHeading}>{t("donations.makeGiftRecurring")}</Text>
                  </View>
                </View>
                <Switch value={isRecurring} onValueChange={setIsRecurring} thumbColor={isRecurring ? colors.primary : "#f4f3f4"} trackColor={{ false: "#545861", true: colors.primary }} />
              </View>
            )}
            {!isMembership ? (
              <TouchableOpacity
                style={styles.processDateRow}
                activeOpacity={0.75}
                onPress={() => setOpenStartPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t("donations.setProcessDate")}>
                <Text style={[styles.recurringCardHeading, styles.processDateRowLabel]}>{t("donations.processDate")}</Text>
                <View style={styles.processDateValueCenter}>
                  <Text style={styles.processDateValue}>
                    {dayjs(startDate).isSame(dayjs(), "day") ? t("donations.processDateToday") : dayjs(startDate).format("ll")}
                  </Text>
                </View>
                <View style={styles.processDateChevronWrap}>
                  <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.65)" />
                </View>
              </TouchableOpacity>
            ) : null}

            {isRecurring && !isMembership && (
              <View style={[styles.intervalSection, { borderTopColor: colors.border }]}>
                <View style={{ width: DimensionHelper.wp(35) }}>
                  <Text variant="titleSmall" style={[styles.intervalLabel, { color: colors.text }]}>
                    {t("donations.selectInterval")}
                  </Text>
                  <Menu
                    visible={showIntervalMenu}
                    onDismiss={() => setShowIntervalMenu(false)}
                    anchor={
                      <TouchableOpacity style={[styles.selector, { backgroundColor: "#121418", borderColor: "rgba(255,255,255,0.12)" }]} onPress={() => setShowIntervalMenu(true)}>
                        <Text variant="bodyLarge" style={[styles.selectorText, { color: "#FFFFFF" }]}>
                          {getIntervalLabel(selectedInterval)}
                        </Text>
                        <MaterialIcons name="expand-more" size={24} color="rgba(255,255,255,0.72)" />
                      </TouchableOpacity>
                    }>
                    {intervalTypes.map(interval => (
                      <Menu.Item
                        key={interval.value}
                        onPress={() => {
                          setSelectedInterval(interval.value);
                          setShowIntervalMenu(false);
                        }}
                        title={interval.label}
                      />
                    ))}
                  </Menu>
                </View>
                <View style={{ width: DimensionHelper.wp(35) }}>
                  <Text variant="titleSmall" style={[styles.intervalLabel, { color: colors.text }]}>
                  Start Date
                  </Text>
                  <Button mode="outlined" onPress={() => setOpenStartPicker(true)} style={[styles.dateTimeButton, { backgroundColor: "#121418", borderColor: "rgba(255,255,255,0.12)" }]}>
                    <Text style={[styles.dateTimeText, { color: "#FFFFFF" }]}>{dayjs(startDate).format("ll")}</Text>
                  </Button>
                </View>
              </View>
            )}
            {isMembership && (
              <View style={[styles.intervalSection, styles.membershipIntervalSection, { borderTopColor: colors.border, paddingTop: 12 }]}>
                <View style={styles.membershipIntervalColLeft}>
                  <Text variant="titleSmall" style={[styles.intervalLabel, { color: colors.text }]}>
                    {t("subscription.membershipBillingInterval")}
                  </Text>
                  <Text variant="bodyLarge" style={[styles.selectorText, styles.membershipIntervalValue, { color: "#FFFFFF" }]}>
                    {t("donations.monthly")}
                  </Text>
                </View>
                <View style={styles.membershipIntervalColRight}>
                  <Text variant="titleSmall" style={[styles.intervalLabel, { color: colors.text }]}>
                    {t("donations.processDate")}
                  </Text>
                  <Button mode="outlined" onPress={() => setOpenStartPicker(true)} style={[styles.dateTimeButton, styles.membershipDateButton, { backgroundColor: "#121418", borderColor: "rgba(255,255,255,0.12)" }]}>
                    <Text style={[styles.dateTimeText, { color: "#FFFFFF" }]}>{dayjs(startDate).format("ll")}</Text>
                  </Button>
                </View>
              </View>
            )}
            <DatePicker
              modal
              open={openStartPicker}
              date={startDate}
              mode="date"
              minimumDate={dayjs().startOf("day").toDate()}
              onConfirm={date => {
                setOpenStartPicker(false);
                setStartDate(date);
              }}
              onCancel={() => setOpenStartPicker(false)}
            />
          </Card.Content>
        </Card>
      )}

      {/* Payment Method — navigates to full screen to add / manage payment methods */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/(drawer)/addPaymentMethod")} accessibilityRole="button" accessibilityLabel={t("donations.addPaymentMethod")}>
        <Card style={[styles.sectionCard, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)" }]}>
          <Card.Content>
            <View style={styles.paymentCardBody}>
              <View style={styles.paymentCardLeft}>
                <View style={styles.paymentHeaderRow}>
                  <View style={styles.paymentHeaderTextCol}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: "#FFFFFF", marginBottom: 0 }]}>
                      {t("donations.givingSelectPaymentMethodTitle")}
                    </Text>
                  </View>
                </View>
                <View style={styles.methodIconRow}>
                  {!isZimbabwePaynowBranch ? (
                    <View style={styles.methodIconCardShell}>
                      <Image source={bankIcon} style={styles.methodIconImageMono} resizeMode="contain" />
                    </View>
                  ) : null}
                  <View style={styles.methodIconBankCardGlyph} pointerEvents="none">
                    <View style={styles.methodIconBankCardStripe} />
                    <View style={styles.methodIconBankCardLine} />
                  </View>
                  <View style={styles.methodIconCardShell}>
                    <Image source={ecoCashLogo} style={styles.methodIconEcoCashImage} resizeMode="contain" />
                  </View>
                </View>
              </View>
              <View style={styles.paymentChevronWrap}>
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.72)" />
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>

      {/* Saved payment method — only the option selected on Add Payment Method (Giving); membership lists all Stripe PMs */}
      {(isMembership
        ? pm
        : givingRailKey.startsWith(SAVED_METHOD_STRIPE_PREFIX)
          ? pm.filter(m => `${SAVED_METHOD_STRIPE_PREFIX}${m.id}` === givingRailKey)
          : []
      ).map((method, index) => {
        const mBrandLabel = method?.name
          ? method.name.charAt(0).toUpperCase() + method.name.slice(1)
          : "Card";
        const expMonth = method?.exp_month ? String(method.exp_month).padStart(2, "0") : "";
        const expYear = method?.exp_year ? String(method.exp_year) : "";
        const expiryText = expMonth && expYear ? `Expires ${expMonth}/${expYear}` : "";
        const stripeKey = `${SAVED_METHOD_STRIPE_PREFIX}${method.id}`;
        const isSelected = givingRailKey === stripeKey;
        const CardLogo = getCardLogo(method?.name);
        return (
          <Card
            key={String(method.id || index)}
            style={[
              styles.sectionCard,
              styles.surfaceCard,
              {
                backgroundColor: "#1A1A1A",
                borderColor: isSelected ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)"
              }
            ]}>
            <Card.Content>
              <View style={styles.lcCardRow}>
                <TouchableOpacity
                  style={styles.givingSavedRailSelectHit}
                  activeOpacity={0.85}
                  onPress={() => commitGivingSavedChoice(stripeKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${mBrandLabel} ending in ${method.last4}`}>
                  <View style={styles.lcCardLogoWrap}>
                    <CardLogo width={54} height={34} />
                  </View>
                  <View style={styles.lcCardTextCol}>
                    <Text style={styles.lcCardTitle}>
                      {mBrandLabel}{method.last4 ? ` *${method.last4}` : ""}
                    </Text>
                    {!!expiryText && (
                      <Text style={styles.lcCardExpiry}>{expiryText}</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => commitGivingSavedChoice(stripeKey)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}>
                  <MaterialIcons
                    name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                    size={24}
                    color={isSelected ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                  />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        );
      })}

      {!isMembership && showGivingSavedCard && givingRailKey === "paynow" ? (
        <Card
          style={[
            styles.sectionCard,
            styles.surfaceCard,
            {
              backgroundColor: "#1A1A1A",
              borderColor:
                givingRailKey === "paynow" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)"
            }
          ]}>
          <Card.Content>
            <View style={styles.lcCardRow}>
              <TouchableOpacity
                style={styles.givingSavedRailSelectHit}
                activeOpacity={0.9}
                onPress={() => router.push("/(drawer)/addPaymentMethod")}
                accessibilityRole="button"
                accessibilityLabel="Open saved card information">
                <View style={styles.givingSavedCardIconWrap}>
                  <Image
                    source={paynowCardNetwork === "zimswitch" ? zimswitchLogo : visaMastercardLogo}
                    style={styles.givingSavedCardIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.givingSavedCardTextCol}>
                  <Text variant="titleMedium" style={styles.givingSavedCardTitle}>
                    Saved Card Information
                  </Text>
                  {paynowSetup.cardName?.trim() ? (
                    <Text style={styles.givingSavedCardName}>{paynowSetup.cardName.trim()}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => commitGivingSavedChoice("paynow")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="radio"
                accessibilityState={{ checked: givingRailKey === "paynow" }}>
                <MaterialIcons
                  name={givingRailKey === "paynow" ? "radio-button-checked" : "radio-button-unchecked"}
                  size={24}
                  color={givingRailKey === "paynow" ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {!isMembership && hasSavedEcoCashNumber && givingRailKey === "ecocash" ? (
        <Card
          style={[
            styles.sectionCard,
            styles.surfaceCard,
            {
              backgroundColor: "#1A1A1A",
              borderColor:
                givingRailKey === "ecocash" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)"
            }
          ]}>
          <Card.Content>
            <View style={styles.lcCardRow}>
              <TouchableOpacity
                style={styles.givingSavedRailSelectHit}
                activeOpacity={0.85}
                onPress={() => handleQuickMethodSelect("ecocash")}
                onLongPress={() => router.push("/(drawer)/addPaymentMethod")}
                accessibilityRole="button"
                accessibilityLabel={`Select EcoCash ${ecoCashMobileNumber.trim()}`}>
                <View style={styles.lcCardLogoWrap}>
                  <Image source={ecoCashLogo} style={styles.lcEcoCashLogoImage} resizeMode="contain" />
                </View>
                <View style={styles.lcCardTextCol}>
                  <Text style={styles.lcCardTitle}>EcoCash</Text>
                  <Text style={styles.lcCardExpiry}>{ecoCashMobileNumber.trim()}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickMethodSelect("ecocash")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="radio"
                accessibilityState={{ checked: givingRailKey === "ecocash" }}>
                <MaterialIcons
                  name={givingRailKey === "ecocash" ? "radio-button-checked" : "radio-button-unchecked"}
                  size={24}
                  color={givingRailKey === "ecocash" ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {/* Give Button */}
      <Button
        mode="contained"
        onPress={handleGive}
        style={styles.giveButton}
        labelStyle={styles.giveButtonText}
        disabled={isMembership ? false : (!amount || parseFloat(amount) < 0.5)}
        buttonColor={isMembership || (!!amount && parseFloat(amount) >= 0.5) ? "#FFFFFF" : "#6A6D75"}
        textColor={isMembership || (!!amount && parseFloat(amount) >= 0.5) ? "#1A1A1A" : colors.white}>
        {isGiving
          ? "Processing..."
          : showGiveSuccessTick
            ? <MaterialIcons name="task-alt" size={24} color="#1A1A1A" style={styles.giveButtonTickIcon} />
            : (isMembership ? t("subscription.subscribeNow") : t("donations.giveNow"))}
      </Button>

      <Modal visible={showFundPicker} animationType="slide" onRequestClose={() => setShowFundPicker(false)}>
        <View style={styles.fundModalContainer}>
          <View style={styles.fundModalHeader}>
            <TouchableOpacity onPress={() => setShowFundPicker(false)} style={styles.fundModalBackBtn}>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fundModalTitle}>Fund</Text>
            <View style={styles.fundModalHeaderSpacer} />
          </View>

          <ScrollView style={styles.fundModalScroll} contentContainerStyle={styles.fundModalScrollContent} showsVerticalScrollIndicator={false}>
            {fundOptions.length === 0 ? (
              <View style={[styles.fundOptionGroup, { padding: 16 }]}>
                <Text style={styles.fundOptionDescription}>No giving funds are configured yet for this branch.</Text>
              </View>
            ) : null}
            <View style={styles.fundOptionGroup}>
              {fundOptions.filter(f => f.section === "tithe").map((fund, idx) => {
                const selected = selectedFund === fund.id;
                return (
                  <Fragment key={fund.id}>
                    {idx > 0 ? <View style={styles.fundOptionDivider} /> : null}
                    <TouchableOpacity style={styles.fundOptionRow} activeOpacity={0.9} onPress={() => setSelectedFund(fund.id)}>
                      <MaterialIcons name={getTitheFundIcon(fund.key)} size={FUND_OPTION_ICON_SIZE} color={FUND_OPTION_ICON_COLOR} style={styles.fundOptionIcon} />
                      <View style={styles.fundOptionBody}>
                        <Text style={styles.fundOptionTitle}>{fund.name}</Text>
                        <Text style={styles.fundOptionDescription}>{fund.description}</Text>
                      </View>
                      <View style={[styles.fundOptionRadio, selected ? styles.fundOptionRadioSelected : null]}>
                        {selected ? <View style={styles.fundOptionRadioDot} /> : null}
                      </View>
                    </TouchableOpacity>
                  </Fragment>
                );
              })}
            </View>

            <Text style={styles.fundSectionLabel}>{t("donations.offeringsBeyondTheTithe")}</Text>

            <View style={styles.fundOptionGroup}>
              {fundOptions.filter(f => f.section === "offerings").map((fund, idx) => {
                const selected = selectedFund === fund.id;
                return (
                  <Fragment key={fund.id}>
                    {idx > 0 ? <View style={styles.fundOptionDivider} /> : null}
                    <TouchableOpacity style={styles.fundOptionRow} activeOpacity={0.9} onPress={() => setSelectedFund(fund.id)}>
                      <MaterialIcons name={getOfferingFundIcon(fund.key)} size={FUND_OPTION_ICON_SIZE} color={FUND_OPTION_ICON_COLOR} style={styles.fundOptionIcon} />
                      <View style={styles.fundOptionBody}>
                        <Text style={styles.fundOptionTitle}>{fund.name}</Text>
                        <Text style={styles.fundOptionDescription}>{fund.description}</Text>
                      </View>
                      <View style={[styles.fundOptionRadio, selected ? styles.fundOptionRadioSelected : null]}>
                        {selected ? <View style={styles.fundOptionRadioDot} /> : null}
                      </View>
                    </TouchableOpacity>
                  </Fragment>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.fundModalFooter}>
            <Button
              mode="contained"
              onPress={() => setShowFundPicker(false)}
              style={styles.fundModalDoneBtn}
              contentStyle={{ height: fundModalDoneButtonHeight }}
              labelStyle={fundModalFontsLoaded ? styles.fundModalDoneLabel : styles.fundModalDoneLabelSystemBold}
              buttonColor="#FFFFFF"
              textColor="#0F1118"
            >
              Done
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 18
  },

  surfaceCard: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6
  },

  // Amount Section
  amountCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 6
  },
  amountCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  amountInputWrap: {
    flex: 1,
    minWidth: 64,
    marginRight: 10
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%"
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 8
  },
  amountLabel: {
    fontWeight: "600",
    marginBottom: 16
  },
  amountNativeInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: "transparent",
    color: "#FFFFFF",
    fontSize: 50,
    fontWeight: "700",
    textAlign: "left",
    includeFontPadding: false
  },
  amountInputOutline: {
    borderWidth: 2,
    borderRadius: 12
  },
  dollarSign: {
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 52,
    marginRight: 4,
    includeFontPadding: false,
    textAlignVertical: "center"
  },
  amountFundPill: {
    minWidth: 102,
    flexShrink: 0,
    height: 46,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  amountFundPillText: {
    flexShrink: 0,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 6
  },
  fundModalContainer: {
    flex: 1,
    backgroundColor: "#000000"
  },
  fundModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10
  },
  fundModalBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  fundModalTitle: {
    ...givingModalTitle,
    color: "#FFFFFF"
  },
  fundModalHeaderSpacer: {
    width: 34,
    height: 34
  },
  fundModalScroll: { flex: 1 },
  fundModalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  fundOptionGroup: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden"
  },
  fundOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  fundOptionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16
  },
  fundSectionLabel: {
    ...givingSectionHeading,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8
  },
  fundOptionIcon: { marginRight: 12 },
  fundOptionBody: {
    flex: 1,
    marginRight: 10
  },
  fundOptionTitle: {
    ...givingListRowTitle,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "justify"
  },
  fundOptionDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify"
  },
  fundOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  fundOptionRadioSelected: { borderColor: "#FFFFFF" },
  fundOptionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  fundModalFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18
  },
  fundModalDoneBtn: {
    borderRadius: 999,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    justifyContent: "center"
  },
  // Override Paper labelLarge (medium weight) so the face matches Fund heading boldness
  fundModalDoneLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "normal",
    color: "#0F1118"
  },
  fundModalDoneLabelSystemBold: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#0F1118"
  },

  // Guest User Section
  guestCard: {
    borderRadius: 16,
    elevation: 2
  },
  guestTitle: {
    fontWeight: "600",
    marginBottom: 16
  },
  guestInput: { marginBottom: 12 },
  nameRow: {
    flexDirection: "row",
    gap: 12
  },
  nameInput: { flex: 1 },

  // Section Cards
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 6
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 16
  },

  // Selectors
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  selectorText: { fontWeight: "500" },

  // Switch Rows
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  recurringTextBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    marginRight: 12,
    minWidth: 0
  },
  recurringAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
    alignSelf: "stretch",
    minHeight: 36
  },
  recurringCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center"
  },
  recurringCardHeading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#FFFFFF"
  },
  processDateRowLabel: {
    flexShrink: 0,
    marginRight: 8
  },
  processDateRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center"
  },
  processDateValueCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  processDateValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center"
  },
  processDateChevronWrap: {
    width: 28,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center"
  },

  // Interval Section
  intervalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  intervalLabel: {
    fontWeight: "600",
    marginBottom: 12
  },
  membershipFeeText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "700"
  },
  membershipIntervalSection: {
    alignItems: "flex-start",
    columnGap: 16
  },
  membershipIntervalColLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start"
  },
  membershipIntervalColRight: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start"
  },
  membershipIntervalValue: {
    marginTop: 2
  },

  // Card Field
  cardField: {
    height: 50,
    marginVertical: 8
  },

  // Total Section
  totalSection: {
    alignItems: "center",
    paddingVertical: 4
  },
  totalLabel: { fontWeight: "800" },

  // Give Button
  giveButton: {
    borderRadius: 999,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10
  },
  giveButtonText: {
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20
  },
  giveButtonTickIcon: { fontWeight: "800" },
  dateTimeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1
  },
  membershipDateButton: {
    minHeight: 58
  },
  dateTimeText: { fontSize: 14 },

  // Payment Type Selector for Guests
  paymentTypeLabel: {
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8
  },
  paymentTypeButtons: { marginBottom: 8 },
  paymentCardBody: {
    flexDirection: "row",
    alignItems: "center"
  },
  paymentCardLeft: { flex: 1, minWidth: 0 },
  paymentChevronWrap: {
    width: 32,
    flexShrink: 0,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4
  },
  paymentHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start"
  },
  paymentHeaderTextCol: {
    flex: 1,
    minWidth: 0
  },
  givingSavedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  /* LifeChurch-style saved card */
  lcCardRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  givingSavedRailSelectHit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0
  },
  lcCardLogoWrap: {
    width: 64,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  lcCardTextCol: {
    flex: 1,
    minWidth: 0
  },
  lcCardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4
  },
  lcCardExpiry: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13
  },
  lcEcoCashLogoImage: {
    width: 52,
    height: 26
  },
  stripeCardGlyph: {
    width: 38,
    height: 26,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    overflow: "hidden"
  },
  stripeCardGlyphStripe: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  stripeCardGlyphLine: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.28)"
  },
  givingSavedCardIconWrap: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  givingSavedCardEcoIconWrap: {
    width: 52,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  givingSavedCardIcon: {
    width: 38,
    height: 22
  },
  givingSavedCardEcoIcon: {
    width: 44,
    height: 24
  },
  givingSavedCardTextCol: {
    flex: 1,
    minWidth: 0
  },
  givingSavedCardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 3
  },
  givingSavedCardName: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18
  },
  methodIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 12,
    marginBottom: 6,
    gap: 8
  },
  methodIconCardShell: {
    width: 52,
    height: 32,
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  methodIconButtonActive: {
    borderWidth: 2,
    borderColor: "#7FA6FF"
  },
  methodIconImageMono: {
    width: 24,
    height: 16,
    tintColor: "#111111"
  },
  methodIconEcoCashImage: {
    width: 44,
    height: 24
  },
  methodIconBankCardGlyph: {
    width: 52,
    height: 32,
    flexShrink: 0
  },
  methodIconBankCardStripe: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  methodIconBankCardLine: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 9,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#111111"
  },

  // Bank Connection UI
  bankConnectionContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center"
  },
  bankConnectionText: {
    textAlign: "center",
    marginBottom: 8
  },
  bankConnectionSubtext: { textAlign: "center" },
  bankConnectingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8
  },
  bankConnectingText: {},

  ecoCashLogoRow: {
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 4
  },
  ecoCashLogo: {
    height: 22,
    width: 110
  }
});
