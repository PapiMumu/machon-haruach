import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import OptimizedImage from "@/components/OptimizedImage";
import { restoreDrawerProfileAvatar } from "@/hooks/useRestoreDrawerProfileAvatar";
import { LinkInterface } from "@/helpers/Interfaces";
import { NavigationUtils } from "@/helpers/NavigationUtils";
import { UserHelper } from "@/helpers/UserHelper";
import { ApiHelper, EnvironmentHelper } from "../../src/helpers";
import { useChurchStore } from "@/stores/useChurchStore";
import { useCurrentChurch } from "@/stores/useUserStore";
import { useThemeColors } from "@/theme";

const goodNewsDailyHeroImage = require("../../assets/home/Announcements.jpg");
const GOODNEWS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const STORY_DURATION_MS = 6000;

interface GoodNewsMeta {
  subtitle?: string;
  contentCategory?: string;
  featured?: boolean;
  videoType?: string;
  videoData?: string;
}

type MediaKind = "video" | "event" | "image" | "article";
type CategoryName = "Events" | "Videos" | "Story" | "News" | "Uncategorized";

function parseGoodNewsMeta(linkData?: string): GoodNewsMeta {
  const raw = (linkData || "").trim();
  if (!raw.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function getCacheKey(churchId?: string) {
  return `goodnews-daily-cache-${churchId || "unknown"}`;
}

function isRegistrationLikeUrl(url?: string) {
  const normalized = String(url || "").toLowerCase();
  if (!normalized) return false;
  return normalized.includes("/event") || normalized.includes("registration") || normalized.includes("/register");
}

function getYouTubeVideoId(url?: string) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  const match = normalized.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/i);
  return match?.[1] || "";
}

function getVimeoVideoId(url?: string) {
  const normalized = String(url || "").trim();
  if (!normalized) return "";
  return normalized.replace("https://vimeo.com/", "").replace("https://player.vimeo.com/video/", "").split("&")[0];
}

function getMediaKind(item: LinkInterface): MediaKind {
  const linkType = String(item.linkType || "").toLowerCase();
  const meta = parseGoodNewsMeta(item.linkData);
  const videoType = String(meta.videoType || "").toLowerCase();
  const hasVideoMeta = Boolean(videoType && (meta.videoData || item.url));
  const videoId = getYouTubeVideoId(item.url);
  const looksLikeDirectVideo = /\.(mp4|webm|mov|m4v|avi|m3u8)(\?.*)?$/i.test(String(item.url || ""));
  if (videoId || linkType === "stream" || linkType === "sermons" || hasVideoMeta || looksLikeDirectVideo) return "video";
  if (linkType === "registrations" || isRegistrationLikeUrl(item.url)) return "event";
  if (String((item as any)?.photo || "").trim()) return "image";
  return "article";
}

function getVideoEmbedUrl(videoType: string, videoData: string, fallbackUrl?: string, cinematicMode = false) {
  const key = String(videoData || "").trim();
  switch (videoType) {
    case "youtube":
      return key
        ? `https://www.youtube.com/embed/${key}?autoplay=1&controls=${cinematicMode ? 0 : 1}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1`
        : "";
    case "vimeo":
      return key ? `https://player.vimeo.com/video/${key}?autoplay=1${cinematicMode ? "&controls=0&title=0&byline=0&portrait=0" : ""}` : "";
    case "facebook":
      return key
        ? `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D${key}&show_text=0&autoplay=1&allowFullScreen=1`
        : "";
    case "custom":
      return key || fallbackUrl || "";
    default:
      return fallbackUrl || "";
  }
}

function getMediaLabel(kind: MediaKind) {
  switch (kind) {
    case "video": return "Video";
    case "event": return "Event";
    case "image": return "Image";
    default: return "News";
  }
}

function isStoryCategory(item: LinkInterface) {
  const rawCategory = parseGoodNewsMeta(item.linkData).contentCategory || "";
  const normalized = rawCategory.trim().toLowerCase();
  return normalized === "story" || normalized === "stories" || normalized === "image" || normalized === "images";
}

function getNormalizedCategory(item: LinkInterface): CategoryName {
  const rawCategory = parseGoodNewsMeta(item.linkData).contentCategory || "";
  const normalized = rawCategory.trim().toLowerCase();
  if (normalized === "events" || normalized === "event") return "Events";
  if (normalized === "videos" || normalized === "video") return "Videos";
  if (normalized === "story" || normalized === "stories" || normalized === "images" || normalized === "image") return "Story";
  if (normalized === "news" || normalized === "article" || normalized === "articles") return "News";

  const kind = getMediaKind(item);
  if (kind === "event") return "Events";
  if (kind === "video") return "Videos";
  if (kind === "image") return "Story";
  return "News";
}

function getMediaIcon(kind: MediaKind) {
  switch (kind) {
    case "video": return "play-circle-outline";
    case "event": return "event";
    case "image": return "image";
    default: return "article";
  }
}

function showMediaBadge(kind: MediaKind) {
  return kind !== "image";
}

function getDisplayImage(item?: LinkInterface) {
  if (!item) return null;
  if (String((item as any)?.photo || "").trim()) return { uri: (item as any).photo };
  const videoId = getYouTubeVideoId(item.url);
  if (videoId) return { uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` };
  return null;
}

function extractGoodNewsVideoMeta(item: LinkInterface, cinematicMode = false) {
  const meta = parseGoodNewsMeta(item.linkData);
  const inferredType = meta.videoType
    || (item.url?.includes("youtu") ? "youtube" : item.url?.includes("vimeo") ? "vimeo" : item.url?.includes("facebook") ? "facebook" : "custom");
  const inferredData = meta.videoData
    || (inferredType === "youtube" ? getYouTubeVideoId(item.url) : inferredType === "vimeo" ? getVimeoVideoId(item.url) : item.url || "");
  const embedUrl = getVideoEmbedUrl(inferredType, inferredData, item.url || "", cinematicMode);
  const externalUrl = (() => {
    if (inferredType === "youtube") return inferredData ? `https://www.youtube.com/watch?v=${inferredData}` : item.url || "";
    if (inferredType === "vimeo") return inferredData ? `https://vimeo.com/${inferredData}` : item.url || "";
    if (inferredType === "facebook") return inferredData ? `https://www.facebook.com/video.php?v=${inferredData}` : item.url || "";
    return item.url || embedUrl;
  })();
  return {
    title: item.text || "Video",
    subtitle: meta.subtitle || "",
    thumbnail: String((item as any)?.photo || ""),
    videoType: inferredType,
    videoData: inferredData,
    embedUrl,
    externalUrl
  };
}

function getStoryKey(item: LinkInterface) {
  return item.id || `${item.text || ""}__${item.url || ""}__${(item as any)?.photo || ""}`;
}

function toSortedVisibleItems(items: LinkInterface[]): LinkInterface[] {
  return (items || [])
    .filter(item => item.linkType !== "separator")
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

export default function GoodNewsDailyScreen() {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const navigation = useNavigation();
  const currentChurch = useCurrentChurch();
  const links = useChurchStore(s => s.links);
  const loadChurchLinks = useChurchStore(s => s.loadChurchLinks);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<LinkInterface[]>([]);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [isStoryDownloading, setIsStoryDownloading] = useState(false);
  const [openedStoryKeys, setOpenedStoryKeys] = useState<Set<string>>(new Set());
  const storyHoldStartedAt = useRef<number>(0);

  const announcementsLink = useMemo(() => {
    return (links || []).find(l => {
      if (l.linkType === "separator") return false;
      const text = (l.text || "").toLowerCase();
      return text.includes("announcement") || (text.includes("goodnews") && text.includes("daily"));
    });
  }, [links]);

  useEffect(() => {
    if (currentChurch?.id && (!links || links.length === 0)) {
      loadChurchLinks(currentChurch.id);
    }
  }, [currentChurch?.id, links?.length, loadChurchLinks]);

  useEffect(() => {
    UserHelper.addOpenScreenEvent("GoodNewsDailyScreen");
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const screenOptions = {
        title: "",
        headerRight: () => null,
        headerBackVisible: false,
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
            <MaterialIcons
              name="chevron-left"
              size={27}
              color={tc.white}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(drawer)/(tabs)/dashboard");
                }
              }}
            />
          </View>
        )
      };

      navigation.setOptions(screenOptions);
      const parentNav = navigation.getParent?.();
      parentNav?.setOptions?.(screenOptions);

      return () => {
        restoreDrawerProfileAvatar(navigation);
      };
    }, [navigation, tc.white])
  );

  useEffect(() => {
    const loadGoodNewsItems = async () => {
      if (!currentChurch?.id) return;
      setIsLoading(true);
      const cacheKey = getCacheKey(currentChurch.id);
      let hasValidCachedData = false;
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as { items?: LinkInterface[]; updatedAt?: number };
            const cachedItems = Array.isArray(cached?.items) ? toSortedVisibleItems(cached.items) : [];
            const updatedAt = typeof cached?.updatedAt === "number" ? cached.updatedAt : 0;
            const isFresh = updatedAt > 0 && (Date.now() - updatedAt) <= GOODNEWS_CACHE_TTL_MS;
            if (cachedItems.length > 0 && isFresh) {
              setItems(cachedItems);
              setIsUsingCachedData(true);
              setCacheUpdatedAt(updatedAt);
              hasValidCachedData = true;
            }
          } catch {
            // Ignore invalid cache payload and continue with network.
          }
        }

        const data = await ApiHelper.getAnonymous(`/links/church/${currentChurch.id}?category=b1GoodNewsDaily`, "ContentApi");
        const list = Array.isArray(data) ? data : data ? [data] : [];
        const normalizedItems = toSortedVisibleItems(list);
        setItems(normalizedItems);
        setIsUsingCachedData(false);
        setCacheUpdatedAt(Date.now());
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            items: normalizedItems,
            updatedAt: Date.now()
          })
        );
      } catch (error) {
        console.error("Failed to load GoodNews Daily items:", error);
        if (!hasValidCachedData) {
          setItems([]);
          setIsUsingCachedData(false);
          setCacheUpdatedAt(null);
        } else {
          setIsUsingCachedData(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadGoodNewsItems();
  }, [currentChurch?.id]);

  const heroItem = items[0];
  const heroMeta = parseGoodNewsMeta(heroItem?.linkData);
  const heroCategory = heroItem ? getNormalizedCategory(heroItem) : null;
  const heroKind = heroItem ? getMediaKind(heroItem) : null;
  const useHeroAsIntro = Boolean(heroItem && !heroMeta.contentCategory && heroKind === "article");
  const contentItems = useHeroAsIntro ? items.slice(1) : items;
  const featuredItems = useMemo(() => {
    return contentItems.filter(item => Boolean(parseGoodNewsMeta(item.linkData).featured) && !isStoryCategory(item));
  }, [contentItems]);
  const itemsByCategory = useMemo(() => {
    const grouped: Record<CategoryName, LinkInterface[]> = {
      Events: [],
      Videos: [],
      Story: [],
      News: [],
      Uncategorized: []
    };
    contentItems.forEach(item => {
      const category = getNormalizedCategory(item);
      grouped[category].push(item);
    });
    return grouped;
  }, [contentItems]);
  const orderedContentSections = useMemo(() => {
    const seen = new Set<CategoryName>();
    const ordered: CategoryName[] = [];
    contentItems.forEach(item => {
      const category = getNormalizedCategory(item);
      if (category === "Story") return;
      if (seen.has(category)) return;
      seen.add(category);
      ordered.push(category);
    });

    // Keep known sections discoverable even if first items are missing in some environments.
    (["Events", "Videos", "News"] as CategoryName[]).forEach(category => {
      if (!seen.has(category) && (itemsByCategory[category] || []).length > 0) {
        seen.add(category);
        ordered.push(category);
      }
    });
    if (!seen.has("Uncategorized") && (itemsByCategory.Uncategorized || []).length > 0) {
      ordered.push("Uncategorized");
    }
    return ordered;
  }, [contentItems, itemsByCategory]);
  const storyItems = useMemo(() => {
    const sourceItems = contentItems.filter(Boolean) as LinkInterface[];
    const storyEligible = sourceItems.filter(item => isStoryCategory(item) && Boolean(getDisplayImage(item)));
    const seen = new Set<string>();
    return storyEligible.filter(item => {
      const key = getStoryKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [contentItems]);
  const imageStories = useMemo(() => {
    return storyItems.filter(item => getMediaKind(item) === "image");
  }, [storyItems]);
  const storyItem = storyIndex !== null ? imageStories[storyIndex] : null;

  const goToNextStory = () => {
    setStoryProgress(0);
    setStoryIndex(prev => {
      if (prev === null) return prev;
      if (prev >= imageStories.length - 1) return null;
      return prev + 1;
    });
  };

  const goToPreviousStory = () => {
    setStoryProgress(0);
    setStoryIndex(prev => {
      if (prev === null) return prev;
      if (prev <= 0) return 0;
      return prev - 1;
    });
  };

  const closeStoryViewer = () => {
    setStoryIndex(null);
    setIsStoryPaused(false);
    setStoryProgress(0);
  };

  const markStoryOpened = (item: LinkInterface) => {
    const key = getStoryKey(item);
    setOpenedStoryKeys(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleStoryPressIn = () => {
    storyHoldStartedAt.current = Date.now();
    setIsStoryPaused(true);
  };

  const handleStoryPressOut = () => {
    setIsStoryPaused(false);
  };

  const handleStoryTap = (direction: "left" | "right") => {
    const heldForMs = Date.now() - (storyHoldStartedAt.current || 0);
    storyHoldStartedAt.current = 0;
    if (heldForMs > 220) return;
    if (direction === "left") {
      goToPreviousStory();
      return;
    }
    goToNextStory();
  };

  useEffect(() => {
    if (storyIndex === null) {
      setStoryProgress(0);
      return;
    }
    if (storyIndex >= imageStories.length) {
      closeStoryViewer();
      return;
    }
    setStoryProgress(0);
  }, [storyIndex, imageStories.length]);

  useEffect(() => {
    if (storyIndex === null || isStoryPaused) return;
    const stepMs = 100;
    const stepProgress = stepMs / STORY_DURATION_MS;
    const timer = setInterval(() => {
      setStoryProgress(prev => {
        const next = prev + stepProgress;
        if (next >= 1) {
          goToNextStory();
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [storyIndex, isStoryPaused, imageStories.length]);

  useEffect(() => {
    if (!storyItem) return;
    UserHelper.addOpenScreenEvent("GoodNewsStorySlideViewed", {
      itemId: storyItem.id || "",
      title: storyItem.text || "",
      position: storyIndex !== null ? storyIndex + 1 : 0,
      total: imageStories.length
    });
  }, [storyItem, storyIndex, imageStories.length]);

  const openItem = (item: LinkInterface) => {
    const meta = parseGoodNewsMeta(item.linkData);
    const mediaKind = getMediaKind(item);
    const normalizedCategory = getNormalizedCategory(item);
    if (isStoryCategory(item) && mediaKind === "image" && getDisplayImage(item)) {
      const targetKey = getStoryKey(item);
      const idx = imageStories.findIndex(story => getStoryKey(story) === targetKey);
      openStoryByIndex(idx >= 0 ? idx : 0);
      return;
    }
    if (mediaKind === "video") {
      const isStoryVideo = isStoryCategory(item);
      if (isStoryVideo) markStoryOpened(item);
      const vm = extractGoodNewsVideoMeta(item, isStoryVideo);
      if (vm.embedUrl) {
        UserHelper.addOpenScreenEvent("GoodNewsVideoOpened", {
          itemId: item.id || "",
          title: vm.title,
          videoType: vm.videoType
        });
        // Open a dedicated in-app embed player route (Media-like behavior, no YouTube page chrome).
        router.push({
          pathname: "/goodNewsVideoRoot",
          params: {
            title: vm.title,
            subtitle: vm.subtitle,
            thumbnail: vm.thumbnail,
            embedUrl: vm.embedUrl,
            externalUrl: vm.externalUrl,
            storyMode: isStoryVideo ? "1" : "0"
          }
        });
        return;
      }
    }
    if (normalizedCategory === "Events" && (item.linkType === "url" || item.linkType === "page")) {
      const resolvedUrl = item.linkType === "page"
        ? EnvironmentHelper.B1WebRoot.replace("{subdomain}", currentChurch?.subDomain || "") + (item.url || "")
        : String(item.url || "");
      if (resolvedUrl) {
        router.push({
          pathname: "/websiteUrlRoot",
          params: {
            url: resolvedUrl,
            title: item.text || "Event",
            minimalHeader: "1"
          }
        });
        return;
      }
    }
    const normalizedItem = item.linkType === "url" && isRegistrationLikeUrl(item.url)
      ? { ...item, linkType: "registrations", url: "" }
      : item;
    UserHelper.addOpenScreenEvent("GoodNewsDailyItemOpened", {
      itemId: item.id || "",
      title: item.text || "",
      linkType: normalizedItem.linkType || "",
      category: meta.contentCategory || "",
      featured: Boolean(meta.featured)
    });
    NavigationUtils.navigateToScreen(normalizedItem, currentChurch);
  };

  const openStoryByIndex = (index: number) => {
    if (index < 0 || index >= imageStories.length) return;
    const item = imageStories[index];
    markStoryOpened(item);
    UserHelper.addOpenScreenEvent("GoodNewsStoryOpened", {
      itemId: item.id || "",
      title: item.text || ""
    });
    setStoryIndex(index);
    setIsStoryPaused(false);
    setStoryProgress(0);
  };

  const handleStoryStripPress = (item: LinkInterface) => {
    if (getMediaKind(item) === "video") {
      openItem(item);
      return;
    }
    const targetKey = getStoryKey(item);
    const idx = imageStories.findIndex(story => getStoryKey(story) === targetKey);
    if (idx >= 0) openStoryByIndex(idx);
  };

  const handleDownloadStory = async () => {
    if (isStoryDownloading) return;
    if (!storyItem) return;
    const source = getDisplayImage(storyItem) as any;
    const uri = typeof source === "object" && source && typeof source.uri === "string" ? source.uri : "";
    if (!uri) {
      Alert.alert("Download unavailable", "This story image is not available for download.");
      return;
    }
    try {
      setIsStoryDownloading(true);
      UserHelper.addOpenScreenEvent("GoodNewsStoryDownloadTapped", {
        itemId: storyItem.id || "",
        title: storyItem.text || ""
      });

      const FileSystem = await import("expo-file-system/legacy");
      const MediaLibrary = await import("expo-media-library");
      // Request write-focused access so we can save assets even on newer Android permission models.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow media access to save story images to your device.");
        return;
      }

      const cleanUri = uri.split("?")[0] || "";
      const extMatch = cleanUri.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch?.[0] || ".jpg";
      const fileUri = `${FileSystem.cacheDirectory}goodnews-story-${Date.now()}${ext}`;

      const downloaded = await FileSystem.downloadAsync(uri, fileUri);
      const asset = await MediaLibrary.createAssetAsync(downloaded.uri);
      const albumName = "GoodNews Daily";
      // Avoid getAlbumAsync, which can require broader read permissions on some Android devices.
      // Attempt album creation; if blocked, asset is still saved to the default gallery location.
      try {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } catch (albumError) {
        console.warn("Could not place asset into custom album, saved to gallery root instead:", albumError);
      }

      Alert.alert("Downloaded", "Story image saved to your device gallery.");
    } catch (error) {
      console.error("Failed to download story image:", error);
      Alert.alert("Unable to download", "Could not save this image to your device. If prompted, rebuild the app to include media modules.");
      // Fallback: still allow opening the raw URL.
      try {
        await Linking.openURL(uri);
      } catch {}
    } finally {
      setIsStoryDownloading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {storyItems.length > 0 && (
          <View style={styles.storyStripSection}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              scrollEnabled={storyItems.length > 1}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storyStripRow}
            >
              {storyItems.map(item => (
                (() => {
                  const storyKey = getStoryKey(item);
                  const isOpened = openedStoryKeys.has(storyKey);
                  return (
                <TouchableOpacity
                  key={`story-strip-${storyKey}`}
                  activeOpacity={0.85}
                  onPress={() => handleStoryStripPress(item)}
                  style={styles.storyCard}
                >
                  <View style={[styles.storyCardRing, isOpened ? styles.storyCardRingOpened : styles.storyCardRingUnread]}>
                    <OptimizedImage source={getDisplayImage(item) || goodNewsDailyHeroImage} style={styles.storyCardImage} contentFit="cover" />
                  </View>
                </TouchableOpacity>
                  );
                })()
              ))}
            </ScrollView>
          </View>
        )}
        <Text style={styles.body}>{useHeroAsIntro ? (heroMeta.subtitle || t("goodNewsDaily.pageIntro")) : t("goodNewsDaily.pageIntro")}</Text>
        <View style={styles.introDivider} />
        {isUsingCachedData && (
          <Text style={styles.cacheBanner}>
            Offline mode: showing saved GoodNews content{cacheUpdatedAt ? ` (updated ${new Date(cacheUpdatedAt).toLocaleString()})` : ""}.
          </Text>
        )}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={tc.primary} />
          </View>
        ) : (
          <>
            {featuredItems.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Featured Stories</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                    {featuredItems.map((item, index) => {
                      const meta = parseGoodNewsMeta(item.linkData);
                      const mediaKind = getMediaKind(item);
                      return (
                        <TouchableOpacity
                          key={item.id || `${item.text}_${index}`}
                          activeOpacity={0.84}
                          onPress={() => openItem(item)}
                          style={styles.featuredCard}
                        >
                          <OptimizedImage source={getDisplayImage(item) || goodNewsDailyHeroImage} style={styles.featuredImage} contentFit="cover" />
                          {mediaKind === "video" && (
                            <View style={styles.playBadge}>
                              <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                            </View>
                          )}
                          <View style={styles.featuredTextWrap}>
                            <View style={styles.metaRow}>
                              {showMediaBadge(mediaKind) ? (
                                <View style={styles.metaPill}>
                                  <MaterialIcons name={getMediaIcon(mediaKind)} size={12} color="rgba(255,255,255,0.92)" />
                                  <Text style={styles.metaPillText}>{getMediaLabel(mediaKind)}</Text>
                                </View>
                              ) : <View />}
                              {!!meta.contentCategory && <Text style={styles.categoryText}>{meta.contentCategory}</Text>}
                            </View>
                            <Text style={styles.featuredTitle}>{item.text || "Untitled"}</Text>
                            {!!meta.subtitle && <Text style={styles.featuredSubtitle} numberOfLines={2}>{meta.subtitle}</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.sectionDivider} />
              </>
            )}

            {orderedContentSections.map((categoryName, index) => {
              const sectionItems = itemsByCategory[categoryName];
              if (!sectionItems || sectionItems.length === 0) return null;
              const sectionLabel = categoryName === "Events" ? "Upcoming Events" : categoryName;
              if (categoryName === "Videos") {
                return (
                  <React.Fragment key={categoryName}>
                    <View style={[styles.sectionHeader, styles.videoSectionHeader]}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoRailRow}>
                        {sectionItems.map((item, itemIndex) => {
                          return (
                            <TouchableOpacity
                              key={item.id || `${item.text}_${itemIndex}`}
                              activeOpacity={0.84}
                              onPress={() => openItem(item)}
                              style={styles.videoRailCard}
                            >
                              <OptimizedImage source={getDisplayImage(item) || goodNewsDailyHeroImage} style={styles.videoRailImage} contentFit="cover" />
                              <View style={styles.videoRailShade} />
                              <View style={styles.videoRailPlayOverlay}>
                                <MaterialIcons name="play-arrow" size={34} color="#FFFFFF" />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    {index < orderedContentSections.length - 1 && <View style={[styles.sectionDivider, styles.videoSectionDivider]} />}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={categoryName}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{sectionLabel}</Text>
                    <View style={styles.cardList}>
                      {sectionItems.map((item, itemIndex) => {
                        const meta = parseGoodNewsMeta(item.linkData);
                        const mediaKind = getMediaKind(item);
                        return (
                          <TouchableOpacity key={item.id || `${item.text}_${itemIndex}`} activeOpacity={0.84} onPress={() => openItem(item)} style={styles.listCard}>
                            <View style={styles.listThumbWrap}>
                              <OptimizedImage source={getDisplayImage(item) || goodNewsDailyHeroImage} style={styles.listThumb} contentFit="cover" />
                              {mediaKind === "video" && categoryName !== "News" && (
                                <View style={styles.listThumbPlay}>
                                  <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                                </View>
                              )}
                            </View>
                            <View style={styles.listTextWrap}>
                              <View style={styles.metaRow}>
                                {showMediaBadge(mediaKind) && !(categoryName === "News" && mediaKind === "video") ? (
                                  <View style={styles.metaPill}>
                                    <MaterialIcons name={getMediaIcon(mediaKind)} size={12} color="rgba(255,255,255,0.92)" />
                                    <Text style={styles.metaPillText}>{getMediaLabel(mediaKind)}</Text>
                                  </View>
                                ) : <View />}
                              </View>
                            <Text style={categoryName === "Events" ? styles.eventCardTitle : styles.cardTitle} numberOfLines={2}>{item.text || "Untitled"}</Text>
                              {!!meta.subtitle && (
                                <Text
                                style={categoryName === "Events" ? styles.eventCardSubtitle : styles.cardSubtitle}
                                  numberOfLines={categoryName === "Events" ? undefined : 3}
                                >
                                  {meta.subtitle}
                                </Text>
                              )}
                            {categoryName === "Events" && (
                              <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => openItem(item)}
                                style={styles.eventRegisterButton}
                              >
                                <Text style={styles.eventRegisterText}>Register</Text>
                              </TouchableOpacity>
                            )}
                            </View>
                            {categoryName === "News" && (
                              <View style={styles.newsChevronWrap}>
                                <MaterialIcons name="chevron-right" size={27} color="rgba(255,255,255,0.92)" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  {index < orderedContentSections.length - 1 && <View style={styles.sectionDivider} />}
                </React.Fragment>
              );
            })}
            {contentItems.length === 0 && (
              <Text style={styles.emptyText}>No content added yet. Add GoodNews items in Admin to build your category sections.</Text>
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={storyIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeStoryViewer}
      >
        <View style={styles.storyBackdrop}>
          <View style={styles.storyProgressRow}>
            {imageStories.map((item, index) => {
              const fill = storyIndex === null
                ? 0
                : index < storyIndex
                  ? 1
                  : index === storyIndex
                    ? storyProgress
                    : 0;
              return (
                <View key={getStoryKey(item)} style={styles.storyProgressTrack}>
                  <View style={[styles.storyProgressFill, { width: `${Math.max(0, Math.min(1, fill)) * 100}%` }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.storyTopRow}>
            <Text style={styles.storyTitle} numberOfLines={1}>{storyItem?.text || "Story"}</Text>
            <View style={styles.storyActionsRow}>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => setIsStoryPaused(prev => !prev)}
                style={styles.storyActionButton}
              >
                <MaterialIcons name={isStoryPaused ? "play-arrow" : "pause"} size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={handleDownloadStory}
                style={styles.storyActionButton}
              >
                <MaterialIcons name={isStoryDownloading ? "hourglass-top" : "download"} size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={closeStoryViewer}
                style={styles.storyCloseButton}
              >
                <MaterialIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.storyImageWrap}>
            {storyItem ? (
              <>
                <ExpoImage
                  source={getDisplayImage(storyItem) || goodNewsDailyHeroImage}
                  style={styles.storyBackdropImage}
                  contentFit="cover"
                  blurRadius={24}
                />
                <View style={styles.storyBackdropDim} />
                <OptimizedImage source={getDisplayImage(storyItem) || goodNewsDailyHeroImage} style={styles.storyImage} contentFit="contain" />
              </>
            ) : null}
            <View style={styles.storyTapRow}>
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
                onPress={() => handleStoryTap("left")}
                style={styles.storyTapZone}
              />
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
                onPress={() => handleStoryTap("right")}
                style={styles.storyTapZone}
              />
            </View>
          </View>
          {!!parseGoodNewsMeta(storyItem?.linkData).subtitle && (
            <Text style={styles.storyCaption} numberOfLines={4}>
              {parseGoodNewsMeta(storyItem?.linkData).subtitle}
            </Text>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#000000" },
  content: { paddingBottom: 42 },
  heroWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "#121212"
  },
  hero: { width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.32)"
  },
  heroBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 999,
    backgroundColor: "rgba(8,8,10,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    marginHorizontal: 18
  },
  body: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
    marginHorizontal: 18
  },
  introDivider: {
    marginTop: 14,
    marginHorizontal: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  storyStripSection: {
    marginTop: 18,
    marginHorizontal: 18
  },
  storyStripRow: {
    paddingRight: 14
  },
  storyCard: {
    marginRight: 14
  },
  storyCardRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    padding: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden"
  },
  storyCardRingUnread: {
    borderWidth: 5,
    borderColor: "#31C663"
  },
  storyCardRingOpened: {
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.45)"
  },
  storyCardImage: {
    width: "100%",
    height: "100%",
    borderRadius: 63,
    transform: [{ scale: 1.12 }]
  },
  storyVideoOverlay: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)"
  },
  cacheBanner: {
    marginTop: 12,
    marginHorizontal: 18,
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 18
  },
  btn: { marginTop: 24, marginHorizontal: 18, borderRadius: 8 },
  sectionHeader: {
    marginTop: 28,
    marginHorizontal: 18
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  sectionDivider: {
    marginTop: 8,
    marginHorizontal: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  videoSectionHeader: {
    marginTop: 12
  },
  videoSectionDivider: {
    marginTop: 12
  },
  loadingWrap: {
    marginTop: 16,
    marginHorizontal: 18,
    alignItems: "flex-start"
  },
  featuredRow: {
    marginTop: 12,
    paddingRight: 18
  },
  featuredCard: {
    width: 268,
    marginRight: 14,
    borderRadius: 16,
    backgroundColor: "#16181D",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden"
  },
  playBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.56)",
    alignItems: "center",
    justifyContent: "center"
  },
  videoPlayOverlay: {
    position: "absolute",
    right: 12,
    top: "40%",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(33, 120, 255, 0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  videoRailRow: {
    marginTop: 0,
    paddingRight: 18
  },
  videoRailCard: {
    width: 320,
    height: 180,
    marginRight: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#111318",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
    elevation: 5
  },
  videoRailImage: {
    width: "100%",
    height: "100%"
  },
  videoRailShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.12)"
  },
  videoRailPlayOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  featuredImage: {
    width: "100%",
    height: 152
  },
  featuredTextWrap: {
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  metaPillText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: "600"
  },
  categoryText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22
  },
  featuredSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 19
  },
  cardList: {
    marginTop: 12,
    marginHorizontal: 0
  },
  listCard: {
    backgroundColor: "#14171C",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden"
  },
  listThumbWrap: {
    width: 128,
    minHeight: 126,
    alignSelf: "stretch",
    position: "relative",
    overflow: "hidden"
  },
  listThumb: {
    width: "100%",
    height: "100%",
    flex: 1
  },
  listThumbPlay: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center"
  },
  listTextWrap: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 126,
    paddingRight: 44
  },
  newsChevronWrap: {
    position: "absolute",
    right: 10,
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22
  },
  eventCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "justify"
  },
  cardSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 21
  },
  eventCardSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "justify"
  },
  eventRegisterButton: {
    marginTop: 10,
    alignSelf: "stretch",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10
  },
  eventRegisterText: {
    color: "#1A1A1A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800"
  },
  emptyText: {
    marginTop: 14,
    marginHorizontal: 18,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14
  },
  imageGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  imageCard: {
    width: "48%",
    aspectRatio: 0.78,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#181818",
    marginBottom: 12
  },
  imageCardPhoto: {
    width: "100%",
    height: "100%"
  },
  imageCardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.44)"
  },
  imageCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  imageCardSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 16
  },
  storyBackdrop: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center"
  },
  storyProgressRow: {
    position: "absolute",
    top: 16,
    left: 12,
    right: 12,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  storyProgressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.3)"
  },
  storyProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF"
  },
  storyTopRow: {
    position: "absolute",
    top: 30,
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  storyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 10
  },
  storyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  storyActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  storyImageWrap: {
    flex: 1,
    justifyContent: "center",
    position: "relative"
  },
  storyBackdropImage: {
    ...StyleSheet.absoluteFillObject
  },
  storyBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)"
  },
  storyImage: {
    width: "100%",
    height: "100%"
  },
  storyTapRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 15
  },
  storyTapZone: {
    flex: 1
  },
  storyCaption: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 22,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  }
});
