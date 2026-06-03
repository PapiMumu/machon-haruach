import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";

import { VideoPlayer } from "../sermonDetails/VideoPlayer";
import { getStreamingEmbedUrl, type PreviewStreamingService } from "@/helpers/streamingSchedule";

export interface LiveStreamViewScreenProps {
  /** Church member stream page (chat + full stream UI) */
  streamPageUrl: string;
  /** YouTube/Vimeo embed when live */
  embedUrl?: string | null;
  title?: string;
  provider?: string;
  providerKey?: string;
}

function decodeRouteParam(value: string | undefined) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Full-screen live service — opened from Media → Watch Live. */
export function LiveStreamViewScreen({
  streamPageUrl,
  embedUrl,
  title,
  provider,
  providerKey
}: LiveStreamViewScreenProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const displayTitle = title?.trim() || t("sermons.liveStream");
  const pageUrl = streamPageUrl?.trim() || "";
  const decodedEmbed = decodeRouteParam(embedUrl || undefined);

  const playbackUrl = useMemo(() => {
    if (decodedEmbed) return decodedEmbed;

    const key = decodeRouteParam(providerKey);
    if (!key && !provider) return "";

    const stub: PreviewStreamingService = {
      serviceTime: new Date(),
      earlyStart: "0",
      chatBefore: "0",
      chatAfter: "0",
      provider,
      providerKey: key
    };
    return getStreamingEmbedUrl(stub) || "";
  }, [decodedEmbed, provider, providerKey]);

  const videoUrl = playbackUrl || pageUrl;

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: displayTitle,
        headerStyle: { backgroundColor: "#000000" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { color: "#FFFFFF", fontWeight: "700" },
        headerShadowVisible: false,
        headerBackVisible: false,
        headerRight: () => null,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        )
      });
    }, [navigation, displayTitle])
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VideoPlayer videoUrl={videoUrl} visible />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackButton: { marginLeft: 8 },
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#000000"
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32
  }
});
