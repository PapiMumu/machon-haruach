import React, { useEffect, useMemo, useCallback, useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useFocusEffect, useNavigation as useReactNavigation, DrawerActions } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "../../../src/hooks";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";

import { MainHeader } from "../../../src/components/wrapper/MainHeader";
import { LoadingWrapper } from "../../../src/components/wrapper/LoadingWrapper";
import { FeaturedSermon, LiveStreamCard, EmptyState, type LiveStreamData } from "../../../src/components/sermons/exports";
import { MediaHorizontalRow, NetflixPosterCard } from "../../../src/components/media/exports";
import {
  groupSongsForLibrary,
  sortLibraryEntries,
  MusicLibraryHero,
  SpotifyAlbumCard,
  SpotifyPlaylistCard,
  SpotifySingleCard,
  buildSongDetailsHref,
  type SongLibraryEntry
} from "../../../src/components/songs/exports";
import { UserHelper, DateHelper, EnvironmentHelper } from "../../../src/helpers";
import { fetchStreamingPreviewConfig } from "../../../src/helpers/fetchStreamingPreview";
import { ApiHelper } from "@machonharuach/helpers";
import {
  advanceRecurringPreviewServices,
  getPrimaryStreamingService,
  getStreamingEmbedUrl,
  shouldShowLivePlayer,
  hasStreamingSchedule,
  normalizePreviewServices,
  shouldShowStreamOnMedia,
  updateStreamingServiceTimes,
  type StreamingPreviewConfig
} from "../../../src/helpers/streamingSchedule";
import {
  buildMediaCategorySections,
  mediaCategoryI18nKey,
  type MediaRowItem
} from "../../../src/helpers/mediaCategories";
import { PlaylistInterface, SermonInterface } from "@machonharuach/helpers";
import { PublicSongInterface } from "../../../src/interfaces/Song";
import { useCurrentChurch } from "../../../src/stores/useUserStore";
import { useThemeColors } from "../../../src/theme";

const RECENT_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const fetchPublicContent = (path: string) => ApiHelper.getAnonymous(path, "ContentApi");

function selectPublicArray<T>(predicate: (item: any) => boolean) {
  return (data: unknown) => (Array.isArray(data) ? data.filter(predicate) : []) as T[];
}

function isRecentlyPublished(publishDate?: string | Date | null) {
  if (!publishDate) return false;
  const d = DateHelper.toDate(publishDate);
  if (!d) return false;
  return Date.now() - d.getTime() <= RECENT_DAYS_MS;
}

const Sermons = () => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const navigation = useReactNavigation<DrawerNavigationProp<any>>();
  const { navigateBack, router } = useNavigation();
  const [activeSection, setActiveSection] = useState<"playlists" | "music">("playlists");
  const [scheduleNow, setScheduleNow] = useState(() => new Date());
  const currentChurch = useCurrentChurch();
  const queryClient = useQueryClient();
  const churchId = currentChurch?.id;
  const churchSubDomain = currentChurch?.subDomain;

  useEffect(() => {
    UserHelper.addOpenScreenEvent("SermonsScreen");
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!churchId && !churchSubDomain) return;
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0] || "").startsWith("/streaming/preview/")
      });
    }, [churchId, churchSubDomain, queryClient])
  );

  const {
    data: playlists,
    isLoading: playlistsLoading,
    error: playlistsError
  } = useQuery({
    queryKey: ["/playlists/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!currentChurch?.id,
    placeholderData: [],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchPublicContent("/playlists/public/" + currentChurch?.id),
    select: selectPublicArray<PlaylistInterface>((playlist) => playlist && playlist.id && playlist.title)
  });

  const {
    data: recentSermons,
    isLoading: sermonsLoading,
    error: sermonsError
  } = useQuery({
    queryKey: ["/sermons/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!currentChurch?.id,
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: () => fetchPublicContent("/sermons/public/" + currentChurch?.id),
    select: selectPublicArray<SermonInterface>((sermon) => sermon && sermon.id && sermon.title)
  });

  const {
    data: streamingPreview,
    isLoading: streamingLoading,
    error: streamingError
  } = useQuery({
    queryKey: ["/streaming/preview/", churchId, churchSubDomain],
    enabled: !!churchId || !!churchSubDomain,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnMount: "always",
    queryFn: () => fetchStreamingPreviewConfig({ id: churchId, subDomain: churchSubDomain })
  });

  const {
    data: songs,
    isLoading: songsLoading,
    error: songsError
  } = useQuery({
    queryKey: ["/songDetails/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!currentChurch?.id,
    placeholderData: [],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchPublicContent("/songDetails/public/" + currentChurch?.id),
    select: selectPublicArray<PublicSongInterface>((song) => song && song.id)
  });

  /** Watch/stream content loads first; music library can load in the background. */
  const isLoading = playlistsLoading || sermonsLoading || streamingLoading;

  useEffect(() => {
    const id = setInterval(() => setScheduleNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortByAdminOrder = useCallback(
    <T extends { sort?: number }>(items: T[]) =>
      [...items].sort((a, b) => (a.sort ?? 999999) - (b.sort ?? 999999)),
    []
  );

  const sortedSermons = useMemo(() => sortByAdminOrder(recentSermons || []), [recentSermons, sortByAdminOrder]);

  const featuredSermon = useMemo(() => {
    if (!sortedSermons.length) return null;
    return sortedSermons[0];
  }, [sortedSermons]);

  const sortedPlaylists = useMemo(() => sortByAdminOrder(playlists || []), [playlists, sortByAdminOrder]);

  const videoPlaylists = useMemo(
    () => sortedPlaylists.filter((p) => (p.playlistType || "video") !== "music"),
    [sortedPlaylists]
  );

  const musicPlaylists = useMemo(
    () => sortedPlaylists.filter((p) => p.playlistType === "music"),
    [sortedPlaylists]
  );

  const mediaCategorySections = useMemo(
    () => buildMediaCategorySections(videoPlaylists, sortedSermons),
    [videoPlaylists, sortedSermons]
  );

  const songLibrary = useMemo(
    () => sortLibraryEntries(groupSongsForLibrary(songs || [])),
    [songs]
  );

  const albumEntries = useMemo(() => songLibrary.filter((e): e is Extract<SongLibraryEntry, { kind: "album" }> => e.kind === "album"), [songLibrary]);

  const singleEntries = useMemo(() => songLibrary.filter((e): e is Extract<SongLibraryEntry, { kind: "single" }> => e.kind === "single"), [songLibrary]);

  const streamingServices = useMemo(() => {
    const raw = streamingPreview?.services || [];
    if (!raw.length) return [];
    const normalized = normalizePreviewServices(raw);
    advanceRecurringPreviewServices(normalized);
    updateStreamingServiceTimes(normalized);
    return normalized;
  }, [streamingPreview]);

  const primaryStreamingService = useMemo(
    () => getPrimaryStreamingService(streamingServices, scheduleNow),
    [streamingServices, scheduleNow]
  );

  const memberStreamUrl = useMemo(
    () => EnvironmentHelper.B1WebRoot.replace("{subdomain}", currentChurch?.subDomain || "") + "/stream",
    [currentChurch?.subDomain]
  );

  const timeUntilStream = useMemo(() => {
    const target = primaryStreamingService?.localCountdownTime;
    if (!target) return { expired: true, days: 0, hours: 0, minutes: 0 };
    const diffMs = target.getTime() - scheduleNow.getTime();
    if (diffMs <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
    return {
      expired: false,
      days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    };
  }, [primaryStreamingService?.localCountdownTime, scheduleNow]);

  const liveStreamData = useMemo<LiveStreamData>(() => {
    const service = primaryStreamingService;
    const isLive = shouldShowLivePlayer(service, scheduleNow, timeUntilStream.expired);
    const nextStreamDate = service?.localCountdownTime || scheduleNow;
    const embedUrl = service && isLive ? getStreamingEmbedUrl(service) : null;
    return {
      isLive,
      nextStreamDate,
      streamTitle: service?.label || t("sermons.liveStream"),
      streamDescription: service?.sermon?.title || t("sermons.liveStreamHint"),
      streamUrl: memberStreamUrl,
      embedUrl,
      scheduleTimeZone: service?.timeZone
    };
  }, [primaryStreamingService, memberStreamUrl, scheduleNow, timeUntilStream.expired, t]);

  const showStreamHero = useMemo(
    () => shouldShowStreamOnMedia(streamingServices),
    [streamingServices]
  );

  const handleWatchLive = useCallback(() => {
    UserHelper.addOpenScreenEvent("StreamScreen");
    const streamPageUrl = liveStreamData.streamUrl || memberStreamUrl;
    const embed = liveStreamData.embedUrl?.trim() || "";
    const service = primaryStreamingService;
    router.push({
      pathname: "/streamRoot",
      params: {
        url: streamPageUrl,
        title: liveStreamData.streamTitle || t("sermons.liveStream"),
        embedUrl: embed ? encodeURIComponent(embed) : "",
        provider: service?.provider || "",
        providerKey: service?.providerKey ? encodeURIComponent(service.providerKey) : ""
      }
    });
  }, [
    memberStreamUrl,
    liveStreamData.streamTitle,
    liveStreamData.streamUrl,
    liveStreamData.embedUrl,
    primaryStreamingService,
    router,
    t
  ]);

  const handlePlaylistPress = (playlist: PlaylistInterface) => {
    if (!playlist.id || !playlist.title) return;
    router.push("/playlistDetails/" + playlist.id + "?title=" + encodeURIComponent(playlist.title));
  };

  const handleMusicPlaylistPress = (playlist: PlaylistInterface) => {
    if (!playlist.id || !playlist.title) return;
    router.push("/musicPlaylistDetails/" + playlist.id + "?title=" + encodeURIComponent(playlist.title));
  };

  const handleSermonPress = (sermon: SermonInterface) => {
    if (!sermon.id || !sermon.title) return;
    router.push("/sermonDetails/" + sermon.id + "?title=" + encodeURIComponent(sermon.title));
  };

  const handleSongPress = (song: PublicSongInterface) => {
    if (!song.id) return;
    const singlesQueue = singleEntries.map((e) => e.track);
    router.push(buildSongDetailsHref(song, singlesQueue));
  };

  const handleAlbumPress = (entry: Extract<SongLibraryEntry, { kind: "album" }>) => {
    router.push(
      "/songAlbum?artist=" +
        encodeURIComponent(entry.artist) +
        "&album=" +
        encodeURIComponent(entry.album) +
        "&title=" +
        encodeURIComponent(entry.album)
    );
  };

  const formatSermonSubtitle = (sermon: SermonInterface) =>
    sermon.publishDate ? DateHelper.prettyDate(DateHelper.toDate(sermon.publishDate)) : "";

  const formatPlaylistSubtitle = (playlist: PlaylistInterface) =>
    playlist.description?.trim() ||
    (playlist.publishDate ? DateHelper.prettyDate(DateHelper.toDate(playlist.publishDate)) : "");

  const renderSegmentedTabs = () => (
    <View style={styles.segmented}>
      <View style={[styles.segmentedTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
        <View style={[styles.segmentedPill, activeSection === "music" ? styles.segmentedPillActive : null]} />
        <View style={styles.segmentedRow}>
          <Button
            mode="text"
            onPress={() => setActiveSection("playlists")}
            textColor={activeSection === "playlists" ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
            style={styles.segmentedBtn}
            labelStyle={styles.segmentedLabel}>
            {t("media.watch")}
          </Button>
          <Button
            mode="text"
            onPress={() => setActiveSection("music")}
            textColor={activeSection === "music" ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
            style={styles.segmentedBtn}
            labelStyle={styles.segmentedLabel}>
            {t("songs.music")}
          </Button>
        </View>
      </View>
    </View>
  );

  const renderMediaRowItem = (item: MediaRowItem) => {
    if (item.kind === "playlist") {
      const playlist = item.playlist;
      return (
        <NetflixPosterCard
          title={playlist.title}
          thumbnail={playlist.thumbnail}
          subtitle={formatPlaylistSubtitle(playlist)}
          variant="series"
          badge={isRecentlyPublished(playlist.publishDate) ? "recent" : null}
          onPress={() => handlePlaylistPress(playlist)}
        />
      );
    }
    const sermon = item.sermon;
    return (
      <NetflixPosterCard
        title={sermon.title || t("sermons.sermon")}
        thumbnail={sermon.thumbnail}
        subtitle={formatSermonSubtitle(sermon)}
        variant="sermon"
        badge={isRecentlyPublished(sermon.publishDate) ? "recent" : null}
        onPress={() => handleSermonPress(sermon)}
      />
    );
  };

  const renderWatchTab = () => (
    <View style={styles.videoSection}>
      {showStreamHero ? (
        <View style={styles.heroSlot}>
          <LiveStreamCard liveStreamData={liveStreamData} timeUntilStream={timeUntilStream} onWatchLive={handleWatchLive} />
        </View>
      ) : null}
      {featuredSermon && !liveStreamData.isLive ? (
        <View style={showStreamHero ? styles.featuredBelowStream : undefined}>
          <FeaturedSermon sermon={featuredSermon} onPress={handleSermonPress} />
        </View>
      ) : null}

      {mediaCategorySections.length === 0 ? (
        <View style={styles.emptyWatch}>
          <EmptyState type="sermons" />
        </View>
      ) : (
        mediaCategorySections.map((section) => (
          <MediaHorizontalRow
            key={section.category}
            title={t(mediaCategoryI18nKey(section.category))}
            subtitle={t(`media.categoryHints.${section.category}`)}
            data={section.items}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => renderMediaRowItem(item)}
          />
        ))
      )}
    </View>
  );

  const formatMusicPlaylistMeta = (playlist: PlaylistInterface) => {
    const count = playlist.itemCount ?? 0;
    if (count > 0) return t("songs.playlistTrackCount", { count });
    return formatPlaylistSubtitle(playlist);
  };

  const hasMusicLibraryContent = musicPlaylists.length > 0 || albumEntries.length > 0 || singleEntries.length > 0;

  const renderMusicTab = () => (
    <View style={styles.musicSection}>
      <MusicLibraryHero eyebrow={t("songs.libraryEyebrow")} title={t("songs.music")} subtitle={t("songs.musicHint")} />

      <MediaHorizontalRow
        title={t("songs.playlists")}
        subtitle={t("songs.playlistsHint")}
        data={musicPlaylists}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <SpotifyPlaylistCard
            title={item.title || t("songs.playlist")}
            thumbnail={item.thumbnail}
            subtitle={formatMusicPlaylistMeta(item)}
            onPress={() => handleMusicPlaylistPress(item)}
          />
        )}
        emptyComponent={null}
      />

      <MediaHorizontalRow
        title={t("songs.albums")}
        subtitle={t("songs.albumsHint")}
        data={albumEntries}
        keyExtractor={(item) => `album-${item.album}-${item.artist}`}
        renderItem={({ item }) => (
          <SpotifyAlbumCard
            title={item.album}
            artist={item.artist}
            thumbnail={item.tracks[0]?.thumbnail}
            metaLabel={t("songs.trackCount", { count: item.tracks.length })}
            onPress={() => handleAlbumPress(item)}
          />
        )}
        emptyComponent={null}
      />

      <MediaHorizontalRow
        title={t("songs.singles")}
        subtitle={t("songs.singlesHint")}
        data={singleEntries}
        keyExtractor={(item) => item.track.id!}
        renderItem={({ item }) => (
          <SpotifySingleCard
            title={item.track.title || t("songs.song")}
            artist={item.track.artist}
            thumbnail={item.track.thumbnail}
            canPlay={!!item.track.audioUrl?.trim()}
            onPress={() => handleSongPress(item.track)}
          />
        )}
        emptyComponent={null}
      />

      {!hasMusicLibraryContent && !songsLoading ? (
        <View style={styles.emptyMusic}>
          <EmptyState type="songs" />
        </View>
      ) : null}
    </View>
  );

  const canShowWatchContent =
    showStreamHero || !!featuredSermon || mediaCategorySections.length > 0;

  const showFatalError =
    !isLoading &&
    !canShowWatchContent &&
    Boolean(playlistsError && sermonsError) &&
    Boolean(streamingError || !hasStreamingSchedule(streamingServices));

  if (showFatalError) {
    return (
      <SafeAreaView style={styles.container}>
        <MainHeader title={t("sermons.sermons")} openDrawer={() => navigation.dispatch(DrawerActions.openDrawer())} back={() => navigateBack()} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#B0120C" />
          <Text variant="titleMedium" style={styles.errorTitle}>
            {t("sermons.unableToLoad")}
          </Text>
          <Text variant="bodyMedium" style={[styles.errorMessage, { color: tc.textSecondary }]}>
            {t("sermons.checkConnection")}
          </Text>
          <Button mode="contained" onPress={() => navigateBack()} style={styles.errorButton}>
            {t("sermons.goBack")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingWrapper loading={isLoading}>
        <View style={styles.content}>
          <MainHeader title={t("sermons.sermons")} openDrawer={() => navigation.dispatch(DrawerActions.openDrawer())} back={() => navigateBack()} />

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderSegmentedTabs()}
            {activeSection === "playlists" ? renderWatchTab() : renderMusicTab()}
          </ScrollView>
        </View>
      </LoadingWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  content: { flex: 1 },
  scrollView: {
    flex: 1,
    backgroundColor: "#000000"
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  segmented: { marginBottom: 14 },
  segmentedTrack: {
    borderRadius: 999,
    overflow: "hidden",
    position: "relative"
  },
  segmentedRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  segmentedBtn: {
    flex: 1,
    borderRadius: 999
  },
  segmentedLabel: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2
  },
  segmentedPill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    left: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  segmentedPillActive: { left: "50%" },
  videoSection: {
    paddingTop: 4
  },
  emptyWatch: {
    marginTop: 8
  },
  heroSlot: {
    marginBottom: 16,
    marginHorizontal: -16
  },
  featuredBelowStream: {
    marginTop: 4,
    marginBottom: 8
  },
  musicSection: {
    paddingTop: 0
  },
  emptyMusic: {
    marginTop: 24
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32
  },
  errorTitle: {
    color: "#B0120C",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8
  },
  errorMessage: {
    color: "#9E9E9E",
    textAlign: "center",
    marginBottom: 24
  },
  errorButton: { backgroundColor: "#0D47A1" }
});

export default Sermons;
