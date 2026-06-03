import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UserHelper } from "../../../src/helpers";
import { NavigationUtils } from "../../../src/helpers/NavigationUtils";
import { LinkInterface } from "../../../src/helpers/Interfaces";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LoadingWrapper } from "../../../src/components/wrapper/LoadingWrapper";
import { OptimizedImage } from "../../../src/components/OptimizedImage";
import { CardSkeleton } from "../../../src/components/common/Skeleton";
import { updateCurrentScreen } from "../../../src/helpers/PushNotificationHelper";
import { useUserStore, useCurrentChurch, useLinkViewCounts, useIncrementLinkViewCount, useDashboardCards } from "../../../src/stores/useUserStore";
import { useChurchStore } from "../../../src/stores/useChurchStore";
import { HapticsHelper } from "../../../src/helpers/HapticsHelper";
import { useThemeColors } from "@/theme";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { TrialPeriodBanner } from "@/components/billing/TrialPeriodBanner";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { useRestoreDrawerProfileAvatar } from "@/hooks/useRestoreDrawerProfileAvatar";

const goodNewsDailyHeroImage = require("../../../assets/home/Announcements.jpg");
const goodNewsDailyThumbImage = require("../../../assets/home/gnw_logo-gold_512.png");
const coursesAcademicsImage = require("../../../assets/home/PUA.jpg");
const dailyDevotionalImage = require("../../../assets/home/GoodnewsDaily.png");

function getLinkCardSubtitle(item: LinkInterface): string {
  const t = (item.linkType || "").toLowerCase();
  if (t === "stream" || t === "page") return "Watch and explore on demand.";
  if (t === "sermons") return "Latest messages and teaching series.";
  if (t === "bible") return "Read Scripture and grow in the Word.";
  if (t === "lessons") return "Lessons and discipleship resources.";
  if (t === "votd") return "Daily encouragement and reflection.";
  if (t === "plans") return "Follow a plan and stay consistent.";
  if (t === "donation") return "Support the ministry with a gift.";
  if (t === "groups") return "Connect with your church community.";
  if (t === "directory") return "Find people and stay in touch.";
  if (t === "checkin") return "Check in for services and events.";
  if (t === "url") return "Open the link to learn more.";
  return "Stay up to date with the Machon HaRuach.";
}

function getMoreFromOverrides(item: LinkInterface): { title?: string; subtitle?: string; hide?: boolean; imageSource?: any } {
  const lt = (item.linkType || "").toLowerCase();
  const text = (item.text || "").toLowerCase();

  // Remove the Live card from this carousel.
  if (lt === "stream" || text.includes("live")) return { hide: true };

  if (lt === "bible") {
    return {
      title: "Get Free Bible",
      subtitle: "Download a free Bible and grow in the Word."
    };
  }

  if (lt === "sermons") {
    return {
      title: "Daily Devotional",
      subtitle: "Read and download daily devotionals.",
      imageSource: dailyDevotionalImage
    };
  }

  if (lt === "votd") {
    return {
      title: "Courses and Academics",
      subtitle: "Grow deeper through Machon HaRuach academy.",
      imageSource: coursesAcademicsImage
    };
  }

  return {};
}

type DashboardCardDesign = {
  variant?: "featured" | "compact" | "simple";
  overlay?: "none" | "dark" | "gradient";
  ctaStyle?: "solid" | "outline" | "ghost";
  badgeText?: string;
  thumbShape?: "square" | "rounded" | "circle";
  thumbImage?: string;
  titleLines?: number;
  subtitleLines?: number;
};

function parseCardMeta(item?: LinkInterface): { subtitle?: string; sectionLabel?: string; pageId?: string; design?: DashboardCardDesign } {
  if (!item?.linkData) return {};
  const raw = String(item.linkData).trim();
  if (!raw.startsWith("{")) {
    if ((item.linkType || "").toLowerCase() === "page") return { pageId: raw };
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function getCardSection(item?: LinkInterface): "hero" | "featured" | "quick" | "carousel" {
  const section = (item?.icon || "").toLowerCase().trim();
  if (section === "hero") return "hero";
  if (section === "featured") return "featured";
  if (section === "quick") return "quick";
  return "carousel";
}

type MediaHeroCardProps = {
  imageSource: any;
  heroTitle: string;
  footerTitle: string;
  footerSubtitle: string;
  onPress: () => void;
  variant: "featured" | "compact";
  /** When false, hides the centered play control (e.g. GoodNews Daily static image). */
  showPlayButton?: boolean;
  /** Optional different thumbnail for the footer row. */
  footerThumbSource?: any;
  overlay?: "none" | "dark" | "gradient";
  badgeText?: string;
  thumbShape?: "square" | "rounded" | "circle";
  footerTitleLines?: number;
  footerSubtitleLines?: number;
};

function MediaHeroCard({
  imageSource,
  heroTitle,
  footerTitle,
  footerSubtitle,
  onPress,
  variant,
  showPlayButton = true,
  footerThumbSource,
  overlay = "gradient",
  badgeText,
  thumbShape = "rounded",
  footerTitleLines = 1,
  footerSubtitleLines = 2
}: MediaHeroCardProps) {
  const heroHeight = variant === "featured" ? 260 : 168;
  const playSize = variant === "featured" ? 58 : 48;
  const showHeroTitle = (heroTitle || "").trim().length > 0;
  const showFooterTitle = (footerTitle || "").trim().length > 0;

  const thumbRadius = thumbShape === "circle" ? 29 : thumbShape === "square" ? 0 : 10;
  const gradientColors =
    overlay === "none"
      ? null
      : overlay === "dark"
        ? ["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]
        : ["transparent", "rgba(0,0,0,0.75)"];

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.mediaCard, variant === "compact" ? styles.mediaCardCompact : null]}>
      <View style={[styles.mediaCardHero, { height: heroHeight }]}>
        <OptimizedImage source={imageSource} style={styles.mediaCardHeroImage} contentFit="cover" />
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            style={styles.mediaCardHeroGradient}
          />
        ) : null}
        {badgeText ? (
          <View pointerEvents="none" style={styles.mediaCardBadgeWrap}>
            <Text style={styles.mediaCardBadgeText} numberOfLines={1}>{badgeText}</Text>
          </View>
        ) : null}
        {showPlayButton ? (
          <View pointerEvents="none" style={styles.mediaCardPlayWrap}>
            <View style={[styles.mediaCardPlayCircle, { width: playSize, height: playSize, borderRadius: playSize / 2 }]}>
              <MaterialIcons name="play-arrow" size={playSize * 0.55} color="#111111" style={{ marginLeft: 4 }} />
            </View>
          </View>
        ) : null}
        {showHeroTitle ? (
          <View pointerEvents="none" style={styles.mediaCardHeroTitleWrap}>
            <Text style={styles.mediaCardHeroTitle} numberOfLines={2}>
              {heroTitle}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.mediaCardFooter}>
        <View style={[styles.mediaCardFooterThumb, { borderRadius: thumbRadius }]}>
          <OptimizedImage source={footerThumbSource ?? imageSource} style={styles.mediaCardFooterThumbImage} contentFit="cover" />
        </View>
        <View style={styles.mediaCardFooterText}>
          {showFooterTitle ? (
            <Text style={styles.mediaCardFooterTitle} numberOfLines={footerTitleLines}>
              {footerTitle}
            </Text>
          ) : null}
            <Text
            style={[styles.mediaCardFooterSubtitle, !showFooterTitle ? styles.mediaCardFooterSubtitleNoTitle : null]}
            numberOfLines={footerSubtitleLines}>
            {footerSubtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const Dashboard = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentChurch = useCurrentChurch();
  const links = useChurchStore(state => state.links);
  const dashboardCards = useDashboardCards();
  const linkViewCounts = useLinkViewCounts();
  const incrementLinkViewCount = useIncrementLinkViewCount();
  const tc = useThemeColors();

  useRestoreDrawerProfileAvatar();

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () => {});
    UserHelper.addOpenScreenEvent("Dashboard");
    updateCurrentScreen("/(drawer)/(tabs)/dashboard");
    loadDashboardData();
    return () => {
      subscription.remove();
      updateCurrentScreen("");
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    const store = useUserStore.getState();
    if (currentChurch?.id) {
      await Promise.all([
        store.loadChurchLinks(currentChurch.id),
        store.loadDashboardCards(currentChurch.id)
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [currentChurch?.id]);

  useEffect(() => {
    checkRedirect();
    // Always call loadDashboardData to refresh data when screen gains focus
    setLoading(true);
    loadDashboardData();
  }, [currentChurch?.id, loadDashboardData]);

  const onRefresh = useCallback(async () => {
    HapticsHelper.medium();
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);


  const checkRedirect = useCallback(() => {
    if (!currentChurch) router.navigate("/(drawer)/churchSearch");
  }, [currentChurch]);

  const getBackgroundImage = useCallback((item: LinkInterface) => {
    if (item.photo) return { uri: item.photo };

    const imageMap: { [key: string]: any } = {
      groups: require("../../../src/assets/images/dash_worship.png"),
      bible: require("../../../src/assets/images/dash_bible.png"),
      votd: require("../../../src/assets/images/dash_votd.png"),
      lessons: require("../../../src/assets/images/dash_lessons.png"),
      checkin: require("../../../src/assets/images/dash_checkin.png"),
      donation: require("../../../src/assets/images/dash_donation.png"),
      directory: require("../../../src/assets/images/dash_directory.png"),
      plans: require("../../../src/assets/images/dash_votd.png")
    };

    if (item.text.toLowerCase() === "chums") {
      return require("../../../src/assets/images/dash_chums.png");
    }

    return imageMap[item.linkType.toLowerCase()] || require("../../../src/assets/images/dash_url.png");
  }, []);

  const generateLinkId = useCallback((item: LinkInterface) => item.id || `${item.linkType}_${item.text}`, []);

  const handleLinkPress = useCallback(
    (item: LinkInterface) => {
      const meta = parseCardMeta(item);
      const titleText = String(item.text || "").toLowerCase();
      const sectionText = String(meta.sectionLabel || "").toLowerCase();
      const shouldOpenNativePrayer = titleText.includes("prayer") || (item.linkType || "").toLowerCase().includes("prayer");
      const shouldOpenNativeGoodNews = titleText.includes("goodnews daily") || sectionText.includes("goodnews daily");
      if (shouldOpenNativePrayer) {
        router.push("/(drawer)/prayerRequests");
        return;
      }
      if (shouldOpenNativeGoodNews) {
        router.push("/(drawer)/goodNewsDaily");
        return;
      }
      const normalizedItem = (item.linkType || "").toLowerCase() === "page" && meta.pageId
        ? { ...item, linkData: meta.pageId }
        : item;
      const linkId = generateLinkId(item);
      incrementLinkViewCount(linkId);
      NavigationUtils.navigateToScreen(normalizedItem, currentChurch);
    },
    [generateLinkId, incrementLinkViewCount, currentChurch]
  );

  const filteredLinks = useMemo(() => {
    if (!Array.isArray(links)) return [];

    const filtered = links.filter(item => item.linkType !== "separator");

    // Sort by view count (most visited first), then by original order
    return filtered.sort((a, b) => {
      const aId = generateLinkId(a);
      const bId = generateLinkId(b);
      const aCount = linkViewCounts[aId] || 0;
      const bCount = linkViewCounts[bId] || 0;

      // If view counts are equal, maintain original order
      if (aCount === bCount) {
        return filtered.indexOf(a) - filtered.indexOf(b);
      }

      return bCount - aCount; // Sort by view count descending
    });
  }, [links, linkViewCounts, generateLinkId]);

  const findLink = useCallback(
    (pred: (l: LinkInterface) => boolean) => {
      if (!Array.isArray(filteredLinks)) return undefined;
      return filteredLinks.find(pred);
    },
    [filteredLinks]
  );

  const heroBackground = useMemo(() => {
    return require("../../../assets/home/UebertAngel.png");
  }, []);

  const healingInstituteLogo = useMemo(() => {
    return require("../../../assets/home/HealingInstitute.png");
  }, []);

  const prayerLink = useMemo(() => {
    return (
      findLink(l => (l.text || "").toLowerCase().includes("prayer")) ||
      findLink(l => (l.linkType || "").toLowerCase().includes("prayer"))
    );
  }, [findLink]);

  const partnerLink = useMemo(() => {
    // Most churches wire this as donation/giving; fallback to any link that includes "partner".
    return (
      findLink(l => (l.linkType || "").toLowerCase() === "donation") ||
      findLink(l => (l.text || "").toLowerCase().includes("giving")) ||
      findLink(l => (l.text || "").toLowerCase().includes("partner"))
    );
  }, [findLink]);

  const healingInstituteLink = useMemo(() => {
    return findLink(l => (l.text || "").toLowerCase().includes("healing"));
  }, [findLink]);

  /** Church menu link that opens announcements / GoodNews Daily (never VOTD). */
  const announcementsLink = useMemo(() => {
    return findLink(l => {
      const lt = (l.linkType || "").toLowerCase();
      if (lt === "votd") return false;
      const text = (l.text || "").toLowerCase();
      if (text.includes("announcement")) return true;
      if (text.includes("goodnews") && text.includes("daily")) return true;
      return false;
    });
  }, [findLink]);

  const moreFromLinks = useMemo(() => {
    const used = new Set<string>();
    if (healingInstituteLink) used.add(generateLinkId(healingInstituteLink));
    if (announcementsLink) used.add(generateLinkId(announcementsLink));
    if (prayerLink) used.add(generateLinkId(prayerLink));
    if (partnerLink) used.add(generateLinkId(partnerLink));

    return (filteredLinks || [])
      .filter(l => !used.has(generateLinkId(l)))
      .filter(l => !getMoreFromOverrides(l).hide)
      .slice(0, 8);
  }, [filteredLinks, generateLinkId, announcementsLink, healingInstituteLink, partnerLink, prayerLink]);

  const sortedDashboardCards = useMemo(() => {
    if (!Array.isArray(dashboardCards)) return [];
    return [...dashboardCards]
      .filter(card => card && card.linkType !== "separator")
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }, [dashboardCards]);

  const heroCard = useMemo(
    () => sortedDashboardCards.find(card => getCardSection(card) === "hero"),
    [sortedDashboardCards]
  );

  const featuredCards = useMemo(
    () => sortedDashboardCards.filter(card => getCardSection(card) === "featured"),
    [sortedDashboardCards]
  );

  const quickCards = useMemo(
    () => sortedDashboardCards.filter(card => getCardSection(card) === "quick").slice(0, 2),
    [sortedDashboardCards]
  );

  const carouselCards = useMemo(
    () => sortedDashboardCards.filter(card => getCardSection(card) === "carousel"),
    [sortedDashboardCards]
  );

  const effectiveHeroImage = useMemo(
    () => ((heroCard as any)?.photo ? { uri: (heroCard as any).photo } : heroBackground),
    [heroBackground, heroCard]
  );

  const featuredPrimaryCard = featuredCards[0];
  const featuredSecondaryCard = featuredCards[1];
  const quickPrimaryCard = quickCards[0];
  const quickSecondaryCard = quickCards[1];
  const heroMeta = parseCardMeta(heroCard);
  const featuredPrimaryMeta = parseCardMeta(featuredPrimaryCard);
  const featuredSecondaryMeta = parseCardMeta(featuredSecondaryCard);
  const carouselHeadingMeta = parseCardMeta(carouselCards[0]);
  const heroDesign = heroMeta.design || {};

  const primaryButtonVariant = heroDesign.ctaStyle || "solid";
  const primaryButtonStyle =
    primaryButtonVariant === "outline"
      ? [styles.heroButtonOutline, { borderColor: tc.white }]
      : primaryButtonVariant === "ghost"
        ? [styles.heroButtonGhost]
        : [styles.heroButtonSolid];
  const primaryButtonIconColor = primaryButtonVariant === "solid" ? "#0F1118" : "#FFFFFF";
  const primaryButtonTextStyle = primaryButtonVariant === "solid" ? styles.heroButtonSolidText : styles.heroButtonOutlineText;

  const featuredContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      );
    }
    if (filteredLinks.length === 0 && sortedDashboardCards.length === 0) return null;

    return (
      <View style={styles.page}>
        {/* HERO */}
        <View style={styles.hero}>
          <OptimizedImage source={effectiveHeroImage} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroShade} />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.88)"]}
            locations={[0, 0.42, 1]}
            style={styles.heroBottomGradient}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={heroDesign.titleLines || 2}>{heroCard?.text || "Goodnews To You"}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={heroDesign.subtitleLines || 3}>
              {heroMeta.subtitle || "Connect with live services, request prayer and healing, and stay updated with devotionals and announcements all in one place."}
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={primaryButtonStyle}
                onPress={() => {
                  if (quickPrimaryCard) handleLinkPress(quickPrimaryCard);
                  else if (prayerLink) handleLinkPress(prayerLink);
                }}
              >
                <View style={styles.heroButtonContent}>
                  <MaterialIcons name="favorite-border" size={18} color={primaryButtonIconColor} />
                  <Text style={primaryButtonTextStyle}>{quickPrimaryCard?.text || "Prayer Requests"}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.heroButtonOutline, { borderColor: tc.white }]}
                onPress={() => {
                  router.push("/(drawer)/(tabs)/donation");
                }}
              >
                <View style={styles.heroButtonContent}>
                  <MaterialIcons name="handshake" size={18} color="#FFFFFF" />
                  <Text style={styles.heroButtonOutlineText}>{quickSecondaryCard?.text || "Partner"}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* HEALING INSTITUTE */}
        <Text style={styles.sectionLabel}>{featuredPrimaryMeta.sectionLabel || "Healing Institute"}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.simpleCard}
          onPress={() => {
            if (featuredPrimaryCard) handleLinkPress(featuredPrimaryCard);
            else if (healingInstituteLink) handleLinkPress(healingInstituteLink);
          }}
        >
          <View style={styles.simpleCardLeft}>
            <View style={styles.simpleCardIcon}>
              <Image
                source={(featuredPrimaryCard as any)?.photo ? { uri: (featuredPrimaryCard as any).photo } : healingInstituteLogo}
                style={styles.simpleCardLogo}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.simpleCardTitle}>{featuredPrimaryCard?.text || "Need healing?"}</Text>
              <Text style={styles.simpleCardSubtitle} numberOfLines={featuredPrimaryMeta.design?.subtitleLines || 2}>
                {featuredPrimaryMeta.subtitle || "Connect to Healing Institute and receive ministry from anywhere."}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={"rgba(255,255,255,0.7)"} />
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        {/* GOODNEWS DAILY */}
        <Text style={[styles.sectionLabel, styles.goodNewsDailySectionLabel]}>
          {featuredSecondaryMeta.sectionLabel || "GoodNews Daily"}
        </Text>
        <MediaHeroCard
          variant="featured"
          imageSource={(featuredSecondaryCard as any)?.photo ? { uri: (featuredSecondaryCard as any).photo } : goodNewsDailyHeroImage}
          showPlayButton={false}
          heroTitle=""
          footerTitle=""
          footerSubtitle={featuredSecondaryMeta.subtitle || t("goodNewsDaily.cardSubtitle")}
          footerThumbSource={featuredSecondaryMeta.design?.thumbImage ? { uri: featuredSecondaryMeta.design.thumbImage } : goodNewsDailyThumbImage}
          overlay={featuredSecondaryMeta.design?.overlay || "gradient"}
          badgeText={featuredSecondaryMeta.design?.badgeText || ""}
          thumbShape={featuredSecondaryMeta.design?.thumbShape || "rounded"}
          footerTitleLines={featuredSecondaryMeta.design?.titleLines || 1}
          footerSubtitleLines={featuredSecondaryMeta.design?.subtitleLines || 2}
          onPress={() => {
            if (featuredSecondaryCard) handleLinkPress(featuredSecondaryCard);
            else router.push("/(drawer)/goodNewsDaily");
          }}
        />

        <View style={styles.sectionDivider} />

        {/* MORE FROM */}
        <Text style={styles.sectionLabel}>
          {carouselHeadingMeta.sectionLabel || "More from Machon HaRuach"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moreRow}>
          {(carouselCards.length > 0 ? carouselCards : moreFromLinks).map(item => {
            const ov = getMoreFromOverrides(item);
            const cardMeta = parseCardMeta(item);
            return (
              <MediaHeroCard
                key={generateLinkId(item)}
                variant="compact"
                imageSource={(item as any)?.photo ? { uri: (item as any).photo } : (ov.imageSource ?? getBackgroundImage(item))}
                heroTitle=""
                footerTitle={ov.title ?? item.text}
                footerSubtitle={cardMeta.subtitle ?? ov.subtitle ?? getLinkCardSubtitle(item)}
                showPlayButton={false}
                footerThumbSource={cardMeta.design?.thumbImage ? { uri: cardMeta.design.thumbImage } : undefined}
                overlay={cardMeta.design?.overlay || "gradient"}
                badgeText={cardMeta.design?.badgeText || ""}
                thumbShape={cardMeta.design?.thumbShape || "rounded"}
                footerTitleLines={cardMeta.design?.titleLines || 1}
                footerSubtitleLines={cardMeta.design?.subtitleLines || 2}
                onPress={() => handleLinkPress(item)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  }, [
    filteredLinks,
    generateLinkId,
    getBackgroundImage,
    handleLinkPress,
    healingInstituteLink,
    carouselCards,
    effectiveHeroImage,
    featuredPrimaryCard,
    featuredSecondaryCard,
    featuredSecondaryMeta.design?.badgeText,
    featuredSecondaryMeta.design?.overlay,
    featuredSecondaryMeta.design?.subtitleLines,
    featuredSecondaryMeta.design?.thumbShape,
    featuredSecondaryMeta.design?.titleLines,
    featuredSecondaryMeta.sectionLabel,
    featuredSecondaryMeta.subtitle,
    isLoading,
    moreFromLinks,
    partnerLink,
    quickPrimaryCard,
    quickSecondaryCard,
    prayerLink,
    sortedDashboardCards.length,
    t,
    tc.white,
    heroCard,
    heroDesign.ctaStyle,
    heroDesign.subtitleLines,
    heroMeta.subtitle,
    carouselHeadingMeta.sectionLabel,
    featuredPrimaryMeta.design?.subtitleLines,
    featuredPrimaryMeta.sectionLabel,
    featuredPrimaryMeta.subtitle
  ]);

  return (
    <SafeAreaProvider>
      <LoadingWrapper loading={isLoading}>
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#175ec1" />
              }
            >
              <TrialPeriodBanner />
              <ProfileCompletionBanner />
              {featuredContent}
            </ScrollView>
          </View>
        </View>
      </LoadingWrapper>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#000000"
  },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24
  },

  page: { paddingBottom: 8 },

  hero: {
    height: 420,
    position: "relative",
    marginBottom: 18
  },
  heroImage: { width: "100%", height: "100%" },
  heroShade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  heroBottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%"
  },
  heroContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 26
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10
  },
  heroSubtitle: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12
  },
  heroButtonSolid: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999
  },
  heroButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  heroButtonSolidText: {
    color: "#0F1118",
    fontSize: 13,
    fontWeight: "800"
  },
  heroButtonOutline: {
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999
  },
  heroButtonGhost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999
  },
  heroButtonOutlineText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },

  sectionLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 10
  },
  goodNewsDailySectionLabel: { fontWeight: "800" },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 18,
    marginBottom: 18,
    marginHorizontal: 18
  },

  simpleCard: {
    marginHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  simpleCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10
  },
  simpleCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  simpleCardLogo: {
    width: 60,
    height: 60
  },
  simpleCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2
  },
  simpleCardSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 16
  },

  mediaCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1A1A1A"
  },
  mediaCardCompact: {
    width: 280,
    marginHorizontal: 0
  },
  mediaCardHero: {
    width: "100%",
    position: "relative",
    overflow: "hidden"
  },
  mediaCardHeroImage: {
    width: "100%",
    height: "100%"
  },
  mediaCardHeroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%"
  },
  mediaCardBadgeWrap: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  mediaCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  mediaCardPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  mediaCardPlayCircle: {
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  mediaCardHeroTitleWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14
  },
  mediaCardHeroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  mediaCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12
  },
  mediaCardFooterThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#121212"
  },
  mediaCardFooterThumbImage: {
    width: "100%",
    height: "100%"
  },
  mediaCardFooterText: {
    flex: 1,
    minWidth: 0
  },
  mediaCardFooterTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  mediaCardFooterSubtitle: {
    color: "#999999",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "400"
  },
  mediaCardFooterSubtitleNoTitle: { marginTop: 0 },

  moreRow: {
    paddingHorizontal: 18,
    gap: 14,
    paddingBottom: 22
  }
});

export default Dashboard;
