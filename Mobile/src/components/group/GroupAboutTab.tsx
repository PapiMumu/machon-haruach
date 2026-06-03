import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Avatar, Button, Card } from "react-native-paper";
import Markdown from "@ronradtke/react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { useThemeColors, CommonStyles } from "../../theme";

interface GroupAboutTabProps {
  about?: string;
  meetingLocation?: string;
  cellAddress?: string;
  leaderPhone?: string;
  onWhatsAppPress?: () => void;
}

export const GroupAboutTab: React.FC<GroupAboutTabProps> = ({ about, meetingLocation, cellAddress, leaderPhone, onWhatsAppPress }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const hasCellInfo = !!meetingLocation || !!cellAddress || !!leaderPhone;
  return (
    <View style={styles.aboutContainer}>
      {hasCellInfo && (
        <Card style={[styles.cellCard, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.cellCardContent}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Cell Group Details
            </Text>
            {!!meetingLocation && <Text style={{ color: colors.text }}>Location: {meetingLocation}</Text>}
            {!!cellAddress && <Text style={{ color: colors.text }}>Address: {cellAddress}</Text>}
            {!!leaderPhone && <Text style={{ color: colors.text }}>Leader: {leaderPhone}</Text>}
            {!!leaderPhone && !!onWhatsAppPress && (
              <Button mode="contained" onPress={onWhatsAppPress} style={styles.whatsAppButton}>
                Contact Leader on WhatsApp
              </Button>
            )}
          </View>
        </Card>
      )}
      {about ? (
        <Markdown style={{ body: { color: colors.text, fontSize: 16, lineHeight: 24 } }}>{about}</Markdown>
      ) : (
        <View style={[CommonStyles.columnCenter, { paddingVertical: 32, paddingHorizontal: 24 }]}>
          <Avatar.Icon size={64} icon="information" style={[{ marginBottom: 16 }, { backgroundColor: colors.iconBackground }]} />
          <Text variant="titleMedium" style={[CommonStyles.titleText, CommonStyles.textCenter, { color: colors.text, marginBottom: 8 }]}>
            {t("groups.noDescriptionAvailable")}
          </Text>
          <Text variant="bodyMedium" style={[CommonStyles.emptyStateText, { color: colors.disabled, lineHeight: 20 }]}>
            {t("groups.groupDetailsWillAppear")}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  aboutContainer: { minHeight: 200 },
  cellCard: { marginBottom: 14 },
  cellCardContent: { padding: 14, gap: 6 },
  whatsAppButton: { marginTop: 8, alignSelf: "flex-start" }
});
