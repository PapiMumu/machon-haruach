import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useThemeColors } from "@/theme";
import {
  FlatList,
  ImageBackground,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrayHelper, UserPostInterface } from "../../../src/helpers";
import { TimelineHelper } from "../../../src/helpers/Timelinehelper";
import { LoadingWrapper } from "../../../src/components/wrapper/LoadingWrapper";
import TimeLinePost from "../../../src/components/MyGroup/TimeLinePost";
import { UpcomingEventsList } from "../../../src/components/events/UpcomingEventsList";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser, useGroupViewCounts, useIncrementGroupViewCount } from "../../../src/stores/useUserStore";
import { useNavigation } from "../../../src/hooks";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

interface Group {
  id: string;
  name: string;
  photoUrl?: string;
  description?: string;
  meetingLocation?: string;
  cellAddress?: string;
  leaderPhone?: string;
  latitude?: number | string;
  longitude?: number | string;
  categoryName?: string;
  labelArray?: string[];
  tags?: string;
}

const GROUP_HERO_SLIDES: ImageSourcePropType[] = [
  require("../../../assets/images/groups/men.jpg"),
  require("../../../assets/images/groups/interaction.jpg"),
  require("../../../assets/images/groups/youth.jpg"),
  require("../../../assets/images/groups/women.jpg"),
  require("../../../assets/images/groups/AboutYourself.jpg"),
  require("../../../assets/images/groups/biblestudy.jpg")
];

/** Matches `(tabs)/_layout` tab bar: 58 + safe bottom pad. */
function tabBarBottomInset(insetsBottom: number): number {
  return 58 + Math.max(insetsBottom, Platform.OS === "ios" ? 10 : 8);
}

const norm = (v?: string) => (v || "").trim().toLowerCase();

const MyGroups = () => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mergeData, setMergedData] = useState<UserPostInterface[]>([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const { router } = useNavigation();
  /** Tab body height (area above bottom tab bar) — `windowHeight` alone mis-sized the hero and hid the CTA. */
  const [tabBodyHeight, setTabBodyHeight] = useState(0);

  const user = useUser();
  const groupViewCounts = useGroupViewCounts();
  const incrementGroupViewCount = useIncrementGroupViewCount();

  // Debug logging

  // Use react-query for groups data — avoid `placeholderData: []`: it makes the query look "successful"
  // with zero rows so users who already belong to a cell briefly see the Join UI after every tab revisit.
  const {
    data: groupsData,
    isPending: groupsPending,
    refetch: refetchGroups
  } = useQuery<Group[]>({
    queryKey: ["/groups/my", "MembershipApi"],
    enabled: !!user?.jwt, // Only run when authenticated
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
  const groups = groupsData ?? [];
  /** Alias: some dependency arrays / hot-reload bundles still reference the old `isLoading` name. */
  const groupsLoading = groupsPending;

  // Use react-query for timeline data
  const {
    data: timelineData,
    isLoading: timelineLoading,
    refetch: refetchTimeline
  } = useQuery({
    queryKey: ["timeline", "user"],
    queryFn: async () => {
      const { posts, groups } = await TimelineHelper.loadForUser();
      return { posts, groups };
    },
    enabled: !!user?.jwt, // Only run when authenticated
    placeholderData: { posts: [], groups: [] },
    staleTime: 0, // Instant stale - timeline includes real-time conversations
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  /** Group membership loading is handled separately so we never flash Join before `/groups/my` resolves. */
  const loading = timelineLoading;

  const loadData = async () => {
    await Promise.all([refetchGroups(), refetchTimeline()]);
  };

  const mergedTimelineData = useMemo(() => {
    if (timelineData?.posts?.length && timelineData?.groups?.length && timelineData.posts.length > 0 && timelineData.groups.length > 0) {
      return timelineData.posts.map(item1 => {
        const value = { ...item1, ...ArrayHelper.getOne(timelineData.groups, "id", item1.groupId) };
        return { item: value };
      });
    }
    return [];
  }, [timelineData]);

  useEffect(() => {
    setMergedData(mergedTimelineData);
  }, [mergedTimelineData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % GROUP_HERO_SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const showGroups = useCallback(
    (item: any, type: "hero" | "featured" | "regular" = "regular") => {
      const handlePress = () => {
        // Track the view
        incrementGroupViewCount(item.id);

        router.navigate({ pathname: `/groupDetails/${item.id}` });
      };

      if (type === "hero") {
        // Hero layout (large full-width card like dashboard)
        return (
          <Card style={[styles.heroCard, { backgroundColor: tc.surface }]} onPress={handlePress}>
            <View style={styles.heroImageContainer}>
              <Card.Cover source={item.photoUrl ? { uri: item.photoUrl } : require("../../../src/assets/images/dash_worship.png")} style={styles.heroImage} />
              <View style={styles.heroOverlay}>
                <Text variant="headlineLarge" style={styles.heroTitle}>
                  {item.name}
                </Text>
                <Text variant="bodyLarge" style={styles.heroSubtitle}>
                  {t("common.tapToExplore")}
                </Text>
              </View>
            </View>
          </Card>
        );
      }

      if (type === "featured") {
        // Featured layout (side-by-side cards like dashboard)
        return (
          <Card style={[styles.featuredCard, { backgroundColor: tc.surface }]} onPress={handlePress}>
            <View style={styles.featuredImageContainer}>
              <Card.Cover source={item.photoUrl ? { uri: item.photoUrl } : require("../../../src/assets/images/dash_worship.png")} style={styles.featuredImage} />
              <View style={styles.featuredOverlay}>
                <Text variant="titleMedium" style={styles.featuredTitle}>
                  {item.name}
                </Text>
              </View>
            </View>
          </Card>
        );
      }

      // Regular layout (compact list items)
      return (
        <Card style={[styles.regularGroupCard, { backgroundColor: tc.surface }]} onPress={handlePress}>
          <View style={styles.regularGroupContent}>
            <View style={styles.regularGroupImageContainer}>
              <Card.Cover source={item.photoUrl ? { uri: item.photoUrl } : require("../../../src/assets/images/dash_worship.png")} style={styles.regularGroupImage} />
            </View>
            <View style={styles.regularGroupTextContainer}>
              <Text variant="titleMedium" style={[styles.regularGroupName, { color: tc.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={[styles.regularGroupSubtitle, { color: tc.textSecondary }]}>
                {t("common.tapToExplore")}
              </Text>
            </View>
          </View>
        </Card>
      );
    },
    [incrementGroupViewCount, tc]
  );

  const renderItems = useCallback((item: any) => <TimeLinePost item={item} onUpdate={loadData} />, [loadData]);

  const isCellGroup = useCallback((group: Group) => {
    const category = norm(group.categoryName);
    const tags = norm(group.tags);
    const labels = (group.labelArray || []).map(label => norm(label));
    return category.includes("cell") || tags.includes("cell") || labels.some(label => label.includes("cell")) || !!group.cellAddress;
  }, []);

  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.filter(isCellGroup);
  }, [groups, isCellGroup]);

  const primaryCellGroup = useMemo(() => {
    if (!Array.isArray(groups)) return null;
    return groups.find(g => isCellGroup(g)) || null;
  }, [groups, isCellGroup]);

  const primaryInterestGroup = useMemo(() => {
    if (!Array.isArray(groups) || !primaryCellGroup) return null;
    return groups.find(g => g.id !== primaryCellGroup.id && !isCellGroup(g)) || null;
  }, [groups, isCellGroup, primaryCellGroup]);

  const shouldRedirectToLeaderContact = !!user?.jwt && !groupsPending && !!primaryCellGroup?.id;

  useFocusEffect(
    useCallback(() => {
      if (!shouldRedirectToLeaderContact || !primaryCellGroup?.id) return;
      router.replace({
        pathname: "/(drawer)/(tabs)/groupLeaderContact",
        params: {
          groupId: primaryCellGroup.id,
          ...(primaryInterestGroup?.id ? { interestGroupId: primaryInterestGroup.id } : {}),
          ...(primaryInterestGroup?.categoryName?.trim() ? { interestCategory: primaryInterestGroup.categoryName.trim() } : {})
        }
      });
    }, [primaryCellGroup?.id, primaryInterestGroup?.categoryName, primaryInterestGroup?.id, router, shouldRedirectToLeaderContact])
  );

  /** Prefer measured tab content height so the hero + CTA sit above the tab bar. */
  const heroFillHeight = useMemo(() => {
    if (tabBodyHeight > 0) return tabBodyHeight;
    const tabBlock = tabBarBottomInset(insets.bottom);
    return Math.max(360, windowHeight - insets.top - tabBlock);
  }, [tabBodyHeight, windowHeight, insets.top, insets.bottom]);

  // Sort groups by view count and separate into hero, featured, and regular
  const sortedGroups = useMemo(() => {
    if (!Array.isArray(filteredGroups)) return { hero: null, featured: [], regular: [] };

    // Sort groups by view count (descending)
    const sorted = [...filteredGroups].sort((a, b) => {
      const aViews = groupViewCounts[a.id] || 0;
      const bViews = groupViewCounts[b.id] || 0;
      return bViews - aViews;
    });

    if (sorted.length === 0) return { hero: null, featured: [], regular: [] };

    // Split into hero (1st), featured (2nd and 3rd), and regular (rest)
    const hero = sorted[0];
    const featured = sorted.slice(1, 3);
    const regular = sorted.slice(3);

    return { hero, featured, regular };
  }, [filteredGroups, groupViewCounts]);

  const groupsGrid = useMemo(() => {
    if (!Array.isArray(groups)) return null;

    const { hero, featured, regular } = sortedGroups;

    return (
      <View>
        <View style={styles.heroFullBleedWrap}>
          <ImageBackground
            source={GROUP_HERO_SLIDES[heroSlideIndex]}
            style={[styles.heroBannerImage, { height: heroFillHeight }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.88)"]}
              locations={[0, 0.35, 1]}
              style={[styles.heroBannerOverlay, { paddingBottom: 20 + Math.min(insets.bottom, 16) }]}
            >
              <View style={styles.heroBannerBottomBlock}>
                <Text style={styles.heroBannerTitle}>Meaningful friendships start here.</Text>
                <TouchableOpacity activeOpacity={0.88} style={styles.heroPrimaryCta} onPress={() => router.push("/(drawer)/groupJoin")}>
                  <Text style={styles.heroPrimaryCtaText}>Join a Group</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {Array.isArray(groups) && groups.length > 0 && filteredGroups.length === 0 && (
          <View style={styles.noGroupsContainer}>
            <Text variant="bodyMedium" style={{ color: tc.textSecondary }}>
              No Cell Groups found yet.
            </Text>
          </View>
        )}
        {/* Hero Section */}
        {hero && <View style={styles.heroSection}>{showGroups(hero, "hero")}</View>}

        {/* Featured Groups */}
        {featured.length > 0 && (
          <View style={styles.featuredSection}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: tc.text }]}>
              {t("common.featured")}
            </Text>
            <View style={styles.featuredGrid}>
              {featured.map(item => (
                <View key={item.id} style={styles.featuredItem}>
                  {showGroups(item, "featured")}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Other Groups */}
        {regular.length > 0 && (
          <View style={styles.regularSection}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: tc.text }]}>
              {t("groups.otherGroups")}
            </Text>
            <View style={styles.regularGroupsList}>
              {regular.map(item => (
                <View key={item.id} style={styles.regularGroupItem}>
                  {showGroups(item, "regular")}
                </View>
              ))}
            </View>
          </View>
        )}
        <UpcomingEventsList />

        {mergeData.length > 0 && (
          <View style={styles.regularSectionTop}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: tc.text }]}>
              {t("groups.latestUpdates")}
            </Text>
          </View>
        )}
      </View>
    );
  }, [groups, sortedGroups, showGroups, mergeData, router, filteredGroups.length, heroSlideIndex, heroFillHeight, tc, insets.bottom]);

  /** Until `/groups/my` resolves, don't render the Join hero (prevents flash when revisiting the tab). */
  if (user?.jwt && groupsPending) {
    return (
      <SafeAreaProvider>
        <LoadingWrapper loading>
          <View style={styles.container} />
        </LoadingWrapper>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <LoadingWrapper loading={loading}>
        <View style={styles.container}>
          <View
            style={styles.contentContainer}
            onLayout={e => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0 && h !== tabBodyHeight) setTabBodyHeight(h);
            }}
          >
            <FlatList
              data={mergeData}
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarBottomInset(insets.bottom) + 24 }]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              ListHeaderComponent={() => <View style={styles.groupsContainer}>{groupsGrid}</View>}
              renderItem={({ item }) => renderItems(item)}
              keyExtractor={() => `key-${Math.random()}`}
              initialNumToRender={8}
              windowSize={10}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={100}
            />
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
  listContent: {
    flexGrow: 1
  },
  groupsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    backgroundColor: "#000000"
  },
  /** Edge-to-edge under drawer header; counters `groupsContainer` horizontal padding. */
  heroFullBleedWrap: {
    marginHorizontal: -16,
    marginBottom: 24,
    backgroundColor: "#000000"
  },
  heroBannerImage: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "#111111"
  },
  heroBannerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20
  },
  heroBannerBottomBlock: {
    width: "100%"
  },
  heroBannerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    letterSpacing: 0,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 14
  },
  heroPrimaryCta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4
  },
  heroPrimaryCtaText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  groupsSection: { marginBottom: 16 },

  // Hero Section (matching dashboard)
  heroSection: { marginBottom: 24 },
  heroCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF"
  },
  heroImageContainer: {
    height: 200,
    position: "relative"
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20
  },
  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  heroSubtitle: {
    color: "#FFFFFF",
    opacity: 0.9,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },

  // Featured Section (matching dashboard)
  featuredSection: { marginBottom: 24 },
  sectionTitle: {
    color: "#3c3c3c",
    fontWeight: "600",
    marginBottom: 16,
    paddingLeft: 4
  },
  featuredGrid: {
    flexDirection: "row",
    gap: 12
  },
  featuredItem: { flex: 1 },
  featuredCard: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  featuredImageContainer: {
    height: 120,
    position: "relative"
  },
  featuredImage: {
    width: "100%",
    height: "100%"
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },

  // Regular Section
  noGroupsContainer: { marginBottom: 20, paddingHorizontal: 4 },
  regularSection: { marginBottom: 16 },
  regularSectionTop: { marginTop: 8 },
  regularGroupsList: { gap: 12 },
  regularGroupItem: { width: "100%" },
  regularGroupCard: {
    overflow: "hidden",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    backgroundColor: "#FFFFFF"
  },
  regularGroupContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center"
  },
  regularGroupImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12
  },
  regularGroupImage: {
    width: "100%",
    height: "100%"
  },
  regularGroupTextContainer: {
    flex: 1,
    justifyContent: "center"
  },
  regularGroupName: {
    color: "#3c3c3c",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2
  },
  regularGroupSubtitle: {
    color: "#9E9E9E",
    fontSize: 12
  },
  timelineSeparator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F6F6F8"
  },
  timelineTitle: {
    color: "#3c3c3c",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center"
  }
});

export default MyGroups;
