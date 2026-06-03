import React from "react";
import { CheckinGroups } from "../../src/components/checkin/CheckinGroups";
import { CheckinHousehold } from "../../src/components/checkin/CheckinHousehold";
import { CheckinServices } from "../../src/components/checkin/CheckinServices";
import { ApiHelper, CheckinHelper, PersonInterface, ServiceTimeInterface } from "../../src/helpers";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation as useReactNavigation, DrawerActions } from "@react-navigation/native";
import { useNavigation } from "../../src/hooks";
import { useState } from "react";
import { Alert, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useThemeColors } from "../../src/theme";
import { MainHeader } from "../../src/components/wrapper/MainHeader";
import { CheckinComplete } from "@/components/checkin/CheckinComplete";
import { useTranslation } from "react-i18next";
import { Button, Text } from "react-native-paper";
import { useCurrentUserChurch } from "@/stores/useUserStore";

let CameraViewComponent: any = null;
let useCameraPermissionHook: any = () => [{ granted: false }, async () => false];
try {
  const cameraModule = require("expo-camera");
  CameraViewComponent = cameraModule.CameraView;
  useCameraPermissionHook = cameraModule.useCameraPermissions;
} catch {
  // Dev client without native module installed; show graceful message instead of crashing.
}

const Service = () => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useReactNavigation<DrawerNavigationProp<any>>();
  const { navigateBack } = useNavigation();
  const currentUserChurch = useCurrentUserChurch();
  const [step, setStep] = useState("Services");
  const [groupMember, setGroupMember] = useState<PersonInterface>();
  const [groupTime, setGroupTime] = useState<ServiceTimeInterface>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissionHook();
  const [hasScanned, setHasScanned] = useState(false);
  const [confirmingScan, setConfirmingScan] = useState(false);

  const parseQrPayload = (raw: string): { tab: "service" | "event"; id: string } | null => {
    try {
      const parsedUrl = new URL(raw);
      const tab = parsedUrl.searchParams.get("tab");
      const id = parsedUrl.searchParams.get("id");
      if ((tab === "service" || tab === "event") && id) return { tab, id };
      return null;
    } catch {
      return null;
    }
  };

  const parseApiErrorMessage = (error: any): string => {
    const raw = String(error?.message || "").trim();
    if (!raw || raw === "{}") return "";
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (Array.isArray(parsed?.errors) && parsed.errors[0]) return String(parsed.errors[0]);
      if (typeof parsed?.message === "string") return parsed.message;
      return raw;
    } catch {
      return raw;
    }
  };

  const handleValidatedQr = async (payload: { tab: "service" | "event"; id: string }) => {
    const personId = currentUserChurch?.person?.id;
    if (!personId) {
      Alert.alert(t("common.alert"), t("auth.signInToAccess"));
      return;
    }

    const selectedServiceId = CheckinHelper.serviceId;
    if (!selectedServiceId) {
      Alert.alert(t("common.alert"), t("checkin.selectService"));
      return;
    }

    if (payload.tab === "service" && payload.id !== selectedServiceId) {
      Alert.alert(t("common.alert"), t("checkin.invalidQrCode", "This QR code does not match the selected service."));
      return;
    }

    if (payload.tab === "event") {
      const matchesEvent = CheckinHelper.serviceTimes?.some(st => st.id === payload.id);
      if (!matchesEvent) {
        Alert.alert(t("common.alert"), t("checkin.invalidQrCode", "This QR code does not match the selected service."));
        return;
      }
    }

    let resolvedServiceTimeId = "";
    if (payload.tab === "event") {
      resolvedServiceTimeId = payload.id;
    } else {
      const availableTimes = CheckinHelper.serviceTimes || [];
      if (availableTimes.length === 1 && availableTimes[0]?.id) {
        resolvedServiceTimeId = availableTimes[0].id;
      } else if (availableTimes.length > 1) {
        Alert.alert(
          t("common.alert"),
          t("checkin.scanEventQrRequired", "This service has multiple events. Please scan the Event QR code to confirm check-in.")
        );
        setHasScanned(false);
        return;
      } else {
        Alert.alert(
          t("common.alert"),
          t("checkin.noServiceTimesFound", "No check-in events were found for this service.")
        );
        setHasScanned(false);
        return;
      }
    }

    try {
      setConfirmingScan(true);
      const pendingVisits = [
        {
          personId,
          serviceId: selectedServiceId,
          visitSessions: [
            {
              session: {
                serviceTimeId: resolvedServiceTimeId
              }
            }
          ]
        }
      ];

      await ApiHelper.post(
        "/visits/checkin?serviceId=" + selectedServiceId + "&peopleIds=" + personId,
        pendingVisits,
        "AttendanceApi"
      );

      setStep("Complete");
      setHasScanned(false);
    } catch (error: any) {
      const details = parseApiErrorMessage(error);
      Alert.alert(
        t("common.error"),
        details
          ? `${t("checkin.checkinFailed", "Unable to confirm check-in from QR code.")}\n\n${details}`
          : t("checkin.checkinFailed", "Unable to confirm check-in from QR code.")
      );
      setHasScanned(false);
    } finally {
      setConfirmingScan(false);
    }
  };

  const handleQrScanned = (result: { data?: string }) => {
    if (hasScanned) return;
    const raw = String(result?.data || "").trim();
    const payload = parseQrPayload(raw);
    if (!payload) {
      setHasScanned(true);
      Alert.alert(t("common.alert"), t("checkin.invalidQrCode", "Invalid QR code for check-in."), [{ text: "OK", onPress: () => setHasScanned(false) }]);
      return;
    }
    setHasScanned(true);
    void handleValidatedQr(payload);
  };

  const handleShowGroups = (member: PersonInterface, time: ServiceTimeInterface) => {
    setGroupMember(member);
    setGroupTime(time);
    setStep("Groups");
  };

  const clearData = () => {
    CheckinHelper.clearData();
    setGroupMember(undefined);
    setGroupTime(undefined);
    setStep("Services");
    navigateBack();
  };

  const handleBack = () => {
    if (step === "ComingSoon") {
      setStep("Services");
    } else if (step === "Complete") {
      setStep("Household");
    } else if (step === "Groups") {
      setStep("Household");
    } else if (step === "Household") {
      setStep("Services");
    } else {
      navigateBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <MainHeader title={t("checkin.checkin")} openDrawer={() => navigation.dispatch(DrawerActions.openDrawer())} back={() => handleBack()} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
        <View style={{ flex: 1 }}>
          {step === "Services" && <CheckinServices onDone={() => setStep("ComingSoon")} handleBack={handleBack} />}
          {step === "ComingSoon" && (
            <View style={styles.scanWrap}>
              <Text variant="headlineSmall" style={[styles.scanTitle, { color: colors.text }]}>
                {t("checkin.scanQrToConfirm", "Scan QR to confirm check-in")}
              </Text>
              <Text variant="bodyMedium" style={[styles.scanSubtitle, { color: colors.textMuted }]}>
                {t("checkin.pointCameraToQr", "Point your camera at the service QR code.")}
              </Text>

              {!CameraViewComponent ? (
                <View style={styles.permissionWrap}>
                  <Text variant="bodyMedium" style={[styles.permissionText, { color: colors.textMuted }]}>
                    {t("checkin.cameraModuleMissing", "Camera module is not available in this build. Rebuild the app to enable QR scanning.")}
                  </Text>
                </View>
              ) : !cameraPermission?.granted ? (
                <View style={styles.permissionWrap}>
                  <Text variant="bodyMedium" style={[styles.permissionText, { color: colors.textMuted }]}>
                    {t("checkin.cameraPermissionNeeded", "Camera permission is required to scan QR codes.")}
                  </Text>
                  <Button mode="contained" onPress={() => void requestCameraPermission()}>
                    {t("checkin.allowCamera", "Allow Camera")}
                  </Button>
                </View>
              ) : (
                <View style={styles.cameraCard}>
                  <CameraViewComponent style={styles.cameraView} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleQrScanned} />
                  <View pointerEvents="none" style={styles.scanOverlay}>
                    <View style={styles.scanFrame}>
                      <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                    </View>
                    <Text variant="bodySmall" style={[styles.scanHint, { color: "rgba(255,255,255,0.9)" }]}>
                      {t("checkin.alignQrInFrame", "Align QR code within the frame")}
                    </Text>
                  </View>
                </View>
              )}

              {hasScanned && !confirmingScan && (
                <Pressable onPress={() => setHasScanned(false)}>
                  <Text style={{ color: colors.primary }}>{t("checkin.scanAgain", "Scan Again")}</Text>
                </Pressable>
              )}
            </View>
          )}
          {step === "Household" && <CheckinHousehold showGroups={handleShowGroups} onDone={() => setStep("Complete")} handleBack={handleBack} />}
          {step === "Groups" && <CheckinGroups member={groupMember!} time={groupTime!} onDone={() => setStep("Household")} handleBack={handleBack} />}
          {step === "Complete" && <CheckinComplete onDone={clearData} handleBack={handleBack} />}
        </View>
      </SafeAreaView>
    </View>
  );
};
export default Service;

const styles = StyleSheet.create({
  scanWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "center"
  },
  scanTitle: {
    fontWeight: "700",
    textAlign: "center"
  },
  scanSubtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16
  },
  cameraCard: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#111"
  },
  cameraView: {
    flex: 1
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  scanFrame: {
    width: 210,
    height: 210,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  scanCorner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#FFFFFF",
    borderWidth: 3
  },
  scanCornerTopLeft: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12
  },
  scanCornerTopRight: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12
  },
  scanCornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12
  },
  scanCornerBottomRight: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12
  },
  scanHint: {
    marginTop: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  permissionWrap: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16
  },
  permissionText: {
    textAlign: "center"
  }
});
