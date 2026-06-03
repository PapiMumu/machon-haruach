import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { ProfileChange } from "../../interfaces";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PendingChangesViewProps {
  changes: ProfileChange[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const PendingChangesView: React.FC<PendingChangesViewProps> = ({
  changes,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (changes.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12)
        }
      ]}
    >
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={[styles.cancelButton, { borderColor: colors.divider }]}
          textColor={colors.text}
          labelStyle={styles.buttonLabel}
          disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={onSubmit}
          style={[styles.submitButton, { backgroundColor: colors.text }]}
          textColor="#111111"
          labelStyle={styles.buttonLabel}
          loading={isSubmitting}
          disabled={isSubmitting}>
          {t("profileEdit.saveChanges")}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
  buttonLabel: {
    fontWeight: "700"
  }
});
