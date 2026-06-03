import React, { useCallback, useMemo } from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

import { LoadingWrapper } from "../../src/components/wrapper/LoadingWrapper";
import { OptimizedImage } from "../../src/components/OptimizedImage";
import { AlbumCreditsSection, AlbumTrackRow, aggregateAlbumCredits, buildSongDetailsHref } from "../../src/components/songs/exports";
import { PublicSongInterface } from "../../src/interfaces/Song";
import { useCurrentChurch } from "../../src/stores/useUserStore";

const SongAlbum = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentChurch = useCurrentChurch();
  const { artist, album, title } = useLocalSearchParams<{ artist: string; album: string; title?: string }>();

  const decodedArtist = artist ? decodeURIComponent(artist) : "";
  const decodedAlbum = album ? decodeURIComponent(album) : "";
  const displayTitle = title ? decodeURIComponent(title) : decodedAlbum;

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: "",
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        )
      });
    }, [navigation])
  );

  const { data: allSongs, isLoading } = useQuery({
    queryKey: ["/songDetails/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!currentChurch?.id,
    placeholderData: [],
    select: (data: any[]) => data.filter((s: any) => s?.id) as PublicSongInterface[]
  });

  const tracks = useMemo(() => {
    if (!allSongs?.length) return [];
    return allSongs
      .filter(
        (s) =>
          (s.album || "").trim().toLowerCase() === decodedAlbum.trim().toLowerCase() &&
          (s.artist || "").trim().toLowerCase() === decodedArtist.trim().toLowerCase()
      )
      .sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999));
  }, [allSongs, decodedAlbum, decodedArtist]);

  const albumCredits = useMemo(() => aggregateAlbumCredits(tracks), [tracks]);

  const coverThumbnail = tracks[0]?.thumbnail;
  const hasCover = coverThumbnail && coverThumbnail.trim() !== "";

  const handleSongPress = (song: PublicSongInterface) => {
    router.push(buildSongDetailsHref(song, tracks));
  };

  return (
    <View style={styles.container}>
      <LoadingWrapper loading={isLoading}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.cover}>
              {hasCover ? (
                <OptimizedImage source={{ uri: coverThumbnail }} style={styles.coverImage} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#1a472a", "#1DB954", "#191414"]} style={styles.coverImage}>
                  <MaterialIcons name="album" size={56} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.albumType}>{t("songs.album")}</Text>
              <Text style={styles.albumTitle}>{displayTitle}</Text>
              {decodedArtist ? <Text style={styles.artist}>{decodedArtist}</Text> : null}
              <Text style={styles.trackMeta}>{t("songs.trackCount", { count: tracks.length })}</Text>
            </View>
          </View>

          <AlbumCreditsSection lines={albumCredits} />

          <View style={styles.trackListHeader}>
            <Text style={styles.listHeading}>{t("songs.albumTracks")}</Text>
          </View>
          <View style={styles.trackList}>
            {tracks.map((track, index) => (
              <AlbumTrackRow key={track.id} song={track} index={index} onPress={handleSongPress} />
            ))}
          </View>
        </ScrollView>
      </LoadingWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212"
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  headerBack: { marginLeft: 4 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 20,
    paddingTop: 8
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#282828",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10
  },
  coverImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  headerText: {
    flex: 1,
    paddingBottom: 4
  },
  albumType: {
    color: "#1DB954",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6
  },
  albumTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28
  },
  artist: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "500"
  },
  trackMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    marginTop: 8
  },
  trackListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4
  },
  listHeading: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  trackList: {
    marginHorizontal: -4
  }
});

export default SongAlbum;
