import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CountryOption, flagImageUri, getCountryOptions } from "../../helpers/countryData";
import { useThemeColors } from "../../theme";

export type CountryPickerMode = "country" | "dialCode";

interface CountryPickerModalProps {
  visible: boolean;
  mode: CountryPickerMode;
  selectedCountryName?: string;
  selectedDialCode?: string;
  onClose: () => void;
  onSelect: (option: CountryOption) => void;
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  mode,
  selectedCountryName,
  selectedDialCode,
  onClose,
  onSelect
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const countryOptions = useMemo(() => getCountryOptions(), []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryOptions;
    return countryOptions.filter(item => {
      const dialDigits = item.dialCode.replace(/\D/g, "");
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.dialCode.toLowerCase().includes(q) ||
        dialDigits.includes(q.replace(/\D/g, ""))
      );
    });
  }, [countryOptions, query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const title =
    mode === "country" ? t("profileEdit.selectCountry") : t("profileEdit.selectDialCode");
  const searchPlaceholder =
    mode === "country" ? t("profileEdit.searchCountries") : t("profileEdit.searchDialCodes");

  const selectedDialDigits = selectedDialCode?.replace(/\D/g, "") ?? "";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.root}>
        <TouchableOpacity activeOpacity={1} style={[styles.backdrop, { backgroundColor: colors.modalOverlay }]} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16)
            }
          ]}>
          <View style={styles.header}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { borderColor: colors.divider, backgroundColor: colors.inputBg }]}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textHint}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: Dimensions.get("window").height * 0.52 }}
            renderItem={({ item }) => {
              const selected =
                mode === "country"
                  ? selectedCountryName === item.name
                  : selectedDialDigits === item.dialCode.replace(/\D/g, "");
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.row, selected && { backgroundColor: colors.iconBackground }]}
                  onPress={() => {
                    onSelect(item);
                    setQuery("");
                  }}>
                  <Image source={{ uri: flagImageUri(item.code) }} style={styles.flag} resizeMode="cover" />
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                    {mode === "country" ? item.name : `${item.name} (${item.dialCode})`}
                  </Text>
                  {mode === "dialCode" ? (
                    <Text style={[styles.rowDial, { color: colors.textSecondary }]}>{item.dialCode}</Text>
                  ) : null}
                  {selected ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: "78%",
    paddingHorizontal: 16,
    paddingTop: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)"
  },
  flag: {
    width: 32,
    height: 22,
    borderRadius: 3,
    marginRight: 12,
    backgroundColor: "rgba(128,128,128,0.15)"
  },
  rowName: {
    flex: 1
  },
  rowDial: {
    marginRight: 8,
    fontWeight: "600"
  }
});
