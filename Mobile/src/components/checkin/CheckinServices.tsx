import { UserHelper, ApiHelper } from "../../../src/helpers";
import React, { useEffect } from "react";
import { FlatList, View, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, Image } from "react-native";
import { LoadingWrapper } from "../../../src/components/wrapper/LoadingWrapper";
import { useAppTheme, useThemeColors } from "../../../src/theme";
import { Card, Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUserChurch } from "../../stores/useUserStore";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useCheckinFlow } from "../../hooks/useCheckinFlow";

interface Props {
  onDone: () => void;
  handleBack: () => void;
}

export const CheckinServices = (props: Props) => {
  const { t } = useTranslation();
  const { theme, spacing } = useAppTheme();
  const colors = useThemeColors();
  const currentUserChurch = useCurrentUserChurch();
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 380;
  const { selectService, selectServiceLoading } = useCheckinFlow(props.onDone);
  const churchId = currentUserChurch?.church?.id;

  // Use react-query for services
  const {
    data: serviceList = [],
    isLoading: servicesLoading,
    error: servicesError
  } = useQuery({
    queryKey: ["/services", "AttendanceApi"],
    enabled: !!currentUserChurch?.jwt,
    placeholderData: [],
    staleTime: 10 * 60 * 1000, // 10 minutes - services don't change frequently
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  const { data: planningByService = {} } = useQuery({
    queryKey: ["/settings/attendanceBranchPlanning", churchId],
    enabled: !!churchId,
    queryFn: async () => {
      const extractServicesMap = (raw: any) => {
        if (!raw) return {};
        let parsed = raw;
        try {
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
        } catch {
          return {};
        }
        return parsed?.services || {};
      };

      try {
        const publicSettings = await ApiHelper.getAnonymous(`/settings/public/${churchId}`, "MembershipApi");
        const publicRaw = Array.isArray(publicSettings)
          ? publicSettings.find((s: any) => s?.keyName === "attendanceBranchPlanning")?.value
          : publicSettings?.attendanceBranchPlanning;
        const fromPublic = extractServicesMap(publicRaw);
        if (Object.keys(fromPublic).length > 0) return fromPublic;

        // Fallback: signed-in users can also read scoped settings directly.
        const scopedSettings = await ApiHelper.get("/settings", "MembershipApi");
        const scopedRaw = (Array.isArray(scopedSettings) ? scopedSettings : []).find((s: any) => s?.keyName === "attendanceBranchPlanning")?.value;
        const fromScoped = extractServicesMap(scopedRaw);
        if (Object.keys(fromScoped).length > 0) return fromScoped;

        return {};
      } catch {
        // Keep the current UI unchanged when planning settings are unavailable.
        return {};
      }
    },
    placeholderData: {}
  });

  useEffect(() => {
    UserHelper.addOpenScreenEvent("ServiceScreen");
  }, []);

  const renderServiceItem = (item: any) => {
    const servicePlan = planningByService?.[item?.id || ""] || {};
    const adImage = String(servicePlan?.advertisementImage || "").trim();
    const date = String(servicePlan?.date || "").trim();
    const time = String(servicePlan?.time || "").trim();
    const hasPlanningContent = !!(adImage || date || time);

    return (
      <TouchableOpacity
        style={[styles.serviceCard, { backgroundColor: "#17181C", borderColor: "rgba(255,255,255,0.1)", shadowColor: colors.shadowBlack }]}
        onPress={() => selectService(item)}
        activeOpacity={0.86}
      >
        <View style={styles.serviceContent}>
          <View style={styles.serviceTopRow}>
            <View style={[styles.serviceIconContainer, { backgroundColor: "rgba(255,255,255,0.07)" }]}>
              <MaterialIcons name="event-available" size={24} color={colors.text} />
            </View>
            <View style={styles.serviceInfo}>
              {item?.name && (
                <Text variant="titleLarge" style={[styles.serviceName, { color: colors.text }]}>
                  {item.name}
                </Text>
              )}
              {item.campus?.name && (
                <Text variant="bodyMedium" style={[styles.campusName, { color: "rgba(255,255,255,0.72)" }]}>
                  {item.campus?.name}
                </Text>
              )}
            </View>
            <View style={styles.serviceArrow}>
              {selectServiceLoading.isLoading && selectServiceLoading.campusId === item.campusId ? (
                <ActivityIndicator />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={colors.iconColor} />
              )}
            </View>
          </View>

          {hasPlanningContent ? (
            <View style={styles.planningWrap}>
              {adImage ? (
                <View style={styles.adImageFrame}>
                  <Image source={{ uri: adImage }} style={styles.adImage} resizeMode="contain" />
                </View>
              ) : null}
              <View style={styles.metaColumn}>
                <View style={styles.metaWrap}>
                  {date ? (
                    <View style={styles.metaPill}>
                      <MaterialIcons name="calendar-today" size={12} color="#D7DBE2" />
                      <Text style={styles.metaText}>Date: {date}</Text>
                    </View>
                  ) : null}
                  {time ? (
                    <View style={styles.metaPill}>
                      <MaterialIcons name="schedule" size={12} color="#D7DBE2" />
                      <Text style={styles.metaText}>Time: {time}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const isInitialLoading = servicesLoading;

  return (
    <LoadingWrapper loading={false}>
      <View style={[styles.container, { backgroundColor: "#000000" }]}>
        {/* Header Section */}
        <View style={[styles.headerWrap, isSmallPhone && styles.headerWrapSmall]}>
          <View style={[styles.headerSection, isSmallPhone && styles.headerSectionSmall, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.1)", shadowColor: colors.shadowBlack }]}>
            <View style={[styles.iconHeaderContainer, isSmallPhone && styles.iconHeaderContainerSmall, { backgroundColor: colors.iconBackground }]}>
              <MaterialIcons name="event" size={isSmallPhone ? 40 : 48} color={colors.text} />
            </View>
            <Text variant={isSmallPhone ? "headlineMedium" : "headlineLarge"} style={[styles.headerTitle, { color: colors.text }]}>
              {t("checkin.selectService")}
            </Text>
            <Text variant="bodyLarge" style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {t("checkin.chooseService")}
            </Text>
          </View>
        </View>

        {/* Services List */}
        <View style={styles.contentSection}>
          {isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodyLarge" style={[styles.loadingText, { color: colors.textMuted }]}>
                {t("checkin.loadingServices")}
              </Text>
            </View>
          ) : serviceList.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: colors.card, shadowColor: colors.shadowBlack }]}>
              <View style={styles.emptyContent}>
                <MaterialIcons name="event-busy" size={64} color={colors.iconColor} />
                <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("checkin.noServicesAvailable")}
                </Text>
                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {t("checkin.noServicesMessage")}
                </Text>
              </View>
            </Card>
          ) : (
            <FlatList data={serviceList} renderItem={({ item }) => renderServiceItem(item)} keyExtractor={(item: any) => item.id} style={styles.servicesList} contentContainerStyle={styles.servicesContent} showsVerticalScrollIndicator={false} />
          )}
        </View>
      </View>
    </LoadingWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10
  },
  headerWrapSmall: {
    paddingTop: 6
  },
  headerSection: {
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12
  },
  headerSectionSmall: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 12
  },
  iconHeaderContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  iconHeaderContainerSmall: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 12
  },
  headerTitle: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8
  },
  headerSubtitle: {
    textAlign: "center",
    maxWidth: "80%"
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 16
  },
  servicesList: { flex: 1 },
  servicesContent: { paddingBottom: 24 },
  serviceCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 3,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 12
  },
  serviceContent: {
    padding: 14
  },
  serviceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  serviceInfo: { flex: 1 },
  serviceName: {
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20
  },
  campusName: {
    fontWeight: "500",
    fontSize: 12,
    marginTop: 2
  },
  planningWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  adImageFrame: {
    width: 110,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center"
  },
  adImage: {
    width: "100%",
    height: "100%"
  },
  metaColumn: {
    flex: 1
  },
  metaWrap: {
    flexDirection: "column",
    gap: 6
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5
  },
  metaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12
  },
  serviceArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center"
  },
  emptyCard: {
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  emptyContent: {
    padding: 32,
    alignItems: "center"
  },
  emptyTitle: {
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center"
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48
  },
  loadingText: { marginTop: 16 }
});
