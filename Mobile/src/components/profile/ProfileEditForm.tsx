import React from "react";
import { Pressable, View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Card, Menu } from "react-native-paper";
import { PersonInterface } from "../../interfaces";
import { DateHelper } from "../../helpers/DateHelper";
import { findCountryByName, formatPhoneNumber, parsePhoneNumber } from "../../helpers/countryData";
import { PhotoPicker } from "./PhotoPicker";
import { CountryPickerModal } from "../shared/CountryPickerModal";
import DatePicker from "react-native-date-picker";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../theme";

const PHONE_FIELD_KEYS = ["contactInfo.mobilePhone", "contactInfo.homePhone", "contactInfo.workPhone"] as const;

const GENDER_VALUES = ["Male", "Female"] as const;
const MARITAL_STATUS_VALUES = ["Single", "Married", "Divorced", "Widowed"] as const;

const MARITAL_STATUS_LABEL_KEYS: Record<(typeof MARITAL_STATUS_VALUES)[number], string> = {
  Single: "profileEdit.maritalStatusSingle",
  Married: "profileEdit.maritalStatusMarried",
  Divorced: "profileEdit.maritalStatusDivorced",
  Widowed: "profileEdit.maritalStatusWidowed"
};

interface ProfileEditFormProps {
  person: PersonInterface;
  modifiedFields: Set<string>;
  onFieldChange: (key: string, value: string) => void;
  onPhotoChange: (photoUri: string) => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  person,
  modifiedFields,
  onFieldChange,
  onPhotoChange
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [genderMenuVisible, setGenderMenuVisible] = React.useState(false);
  const [maritalStatusMenuVisible, setMaritalStatusMenuVisible] = React.useState(false);
  const [countryModalVisible, setCountryModalVisible] = React.useState(false);
  const [dialPickerKey, setDialPickerKey] = React.useState<string | null>(null);
  const [phoneDialOverrides, setPhoneDialOverrides] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setPhoneDialOverrides({});
  }, [person?.id]);

  const genderValue = GENDER_VALUES.includes(person?.gender as (typeof GENDER_VALUES)[number])
    ? person.gender
    : "";

  const genderDisplayValue =
    genderValue === "Male"
      ? t("profileEdit.genderMale")
      : genderValue === "Female"
        ? t("profileEdit.genderFemale")
        : "";

  const maritalStatusValue = MARITAL_STATUS_VALUES.includes(
    person?.maritalStatus as (typeof MARITAL_STATUS_VALUES)[number]
  )
    ? person.maritalStatus
    : "";

  const maritalStatusDisplayValue = maritalStatusValue
    ? t(MARITAL_STATUS_LABEL_KEYS[maritalStatusValue as (typeof MARITAL_STATUS_VALUES)[number]])
    : "";

  const getFieldValue = (key: string): string => {
    const parts = key.split(".");
    let value: any = person;
    for (const part of parts) {
      value = value?.[part];
    }
    if (key === "birthDate" && value) {
      return DateHelper.toDate(value).toLocaleDateString();
    }
    return value || "";
  };

  const isModified = (key: string): boolean => modifiedFields.has(key);

  const defaultDialCode = React.useMemo(() => {
    const countryName = person?.contactInfo?.country?.trim();
    return findCountryByName(countryName)?.dialCode || "+263";
  }, [person?.contactInfo?.country]);

  const getPhoneParts = (key: string) => {
    const stored = getFieldValue(key);
    const parsed = parsePhoneNumber(stored, defaultDialCode);
    const dialCode = phoneDialOverrides[key] ?? parsed.dialCode;
    if (phoneDialOverrides[key] && phoneDialOverrides[key] !== parsed.dialCode) {
      const allDigits = stored.replace(/\D/g, "");
      const dialDigits = dialCode.replace(/\D/g, "");
      const national = allDigits.startsWith(dialDigits) ? allDigits.slice(dialDigits.length) : parsed.national;
      return { dialCode, national };
    }
    return { dialCode, national: parsed.national };
  };

  const renderPhoneInput = (key: (typeof PHONE_FIELD_KEYS)[number], label: string) => {
    const { dialCode, national } = getPhoneParts(key);

    return (
      <View style={[styles.inputWrapper, isModified(key) && styles.modifiedInput]}>
        <View style={styles.phoneRow}>
          <Pressable style={styles.dialInput} onPress={() => setDialPickerKey(key)}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={t("profileEdit.dialCode")}
                value={dialCode}
                editable={false}
                showSoftInputOnFocus={false}
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={isModified(key) ? colors.warning : colors.divider}
                activeOutlineColor={colors.text}
                right={<TextInput.Icon icon="menu-down" />}
              />
            </View>
          </Pressable>
          <View style={styles.phoneNationalInput}>
            <TextInput
              mode="outlined"
              label={label}
              value={national}
              onChangeText={(text) => onFieldChange(key, formatPhoneNumber(dialCode, text))}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: colors.surface }]}
              outlineColor={isModified(key) ? colors.warning : colors.divider}
              activeOutlineColor={colors.text}
            />
          </View>
        </View>
        {isModified(key) && <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />}
      </View>
    );
  };

  const activeDialPickerKey = dialPickerKey && PHONE_FIELD_KEYS.includes(dialPickerKey as (typeof PHONE_FIELD_KEYS)[number])
    ? (dialPickerKey as (typeof PHONE_FIELD_KEYS)[number])
    : null;
  const activeDialParts = activeDialPickerKey ? getPhoneParts(activeDialPickerKey) : null;

  const renderInput = (
    key: string,
    label: string,
    options?: {
      keyboardType?: "default" | "email-address" | "phone-pad";
      multiline?: boolean;
    }
  ) => (
    <View style={[styles.inputWrapper, isModified(key) && styles.modifiedInput]}>
      <TextInput
        mode="outlined"
        label={label}
        value={getFieldValue(key)}
        onChangeText={(text) => onFieldChange(key, text)}
        keyboardType={options?.keyboardType || "default"}
        multiline={options?.multiline}
        style={[styles.input, { backgroundColor: colors.surface }]}
        outlineColor={isModified(key) ? colors.warning : colors.divider}
        activeOutlineColor={colors.text}
      />
      {isModified(key) && <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />}
    </View>
  );

  const birthDate = person?.birthDate ? DateHelper.toDate(person.birthDate) : new Date();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo Section */}
      <PhotoPicker
        currentPhotoUri={person?.photo}
        onPhotoSelected={onPhotoChange}
        personName={person?.name?.display}
      />

      {/* Name Section */}
      <Card style={[styles.section, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            {t("profileEdit.name")}
          </Text>
          <View style={styles.row}>
            {renderInput("name.first", t("profileEdit.firstName"))}
          </View>
          <View style={styles.row}>
            {renderInput("name.middle", t("profileEdit.middleName"))}
          </View>
          <View style={styles.row}>
            {renderInput("name.last", t("profileEdit.lastName"))}
          </View>
        </Card.Content>
      </Card>

      {/* Contact Section */}
      <Card style={[styles.section, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            {t("profileEdit.contact")}
          </Text>
          <View style={styles.row}>
            {renderInput("contactInfo.email", t("profileEdit.email"), { keyboardType: "email-address" })}
          </View>
          <View style={styles.row}>
            <View style={[styles.inputWrapper, isModified("birthDate") && styles.modifiedInput]}>
              <TextInput
                mode="outlined"
                label={t("profileEdit.birthDate")}
                value={getFieldValue("birthDate")}
                onFocus={() => setShowDatePicker(true)}
                showSoftInputOnFocus={false}
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={isModified("birthDate") ? colors.warning : colors.divider}
                activeOutlineColor={colors.text}
                right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
              />
              {isModified("birthDate") && <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputWrapper, isModified("gender") && styles.modifiedInput]}>
              <Menu
                visible={genderMenuVisible}
                onDismiss={() => setGenderMenuVisible(false)}
                anchor={(
                  <Pressable onPress={() => setGenderMenuVisible(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        mode="outlined"
                        label={t("profileEdit.gender")}
                        value={genderDisplayValue}
                        editable={false}
                        showSoftInputOnFocus={false}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        outlineColor={isModified("gender") ? colors.warning : colors.divider}
                        activeOutlineColor={colors.text}
                        right={<TextInput.Icon icon="menu-down" />}
                      />
                    </View>
                  </Pressable>
                )}
              >
                <Menu.Item
                  onPress={() => {
                    onFieldChange("gender", "Male");
                    setGenderMenuVisible(false);
                  }}
                  title={t("profileEdit.genderMale")}
                />
                <Menu.Item
                  onPress={() => {
                    onFieldChange("gender", "Female");
                    setGenderMenuVisible(false);
                  }}
                  title={t("profileEdit.genderFemale")}
                />
              </Menu>
              {isModified("gender") && <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputWrapper, isModified("maritalStatus") && styles.modifiedInput]}>
              <Menu
                visible={maritalStatusMenuVisible}
                onDismiss={() => setMaritalStatusMenuVisible(false)}
                anchor={(
                  <Pressable onPress={() => setMaritalStatusMenuVisible(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        mode="outlined"
                        label={t("profileEdit.maritalStatus")}
                        value={maritalStatusDisplayValue}
                        editable={false}
                        showSoftInputOnFocus={false}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        outlineColor={isModified("maritalStatus") ? colors.warning : colors.divider}
                        activeOutlineColor={colors.text}
                        right={<TextInput.Icon icon="menu-down" />}
                      />
                    </View>
                  </Pressable>
                )}
              >
                {MARITAL_STATUS_VALUES.map((status) => (
                  <Menu.Item
                    key={status}
                    onPress={() => {
                      onFieldChange("maritalStatus", status);
                      setMaritalStatusMenuVisible(false);
                    }}
                    title={t(MARITAL_STATUS_LABEL_KEYS[status])}
                  />
                ))}
              </Menu>
              {isModified("maritalStatus") && <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Address Section */}
      <Card style={[styles.section, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            {t("profileEdit.address")}
          </Text>
          <View style={styles.row}>
            {renderInput("contactInfo.address1", t("profileEdit.addressLine1"))}
          </View>
          <View style={styles.row}>
            {renderInput("contactInfo.address2", t("profileEdit.addressLine2"))}
          </View>
          <View style={styles.row}>
            {renderInput("contactInfo.city", t("profileEdit.city"))}
          </View>
          <View style={styles.row}>
            <View style={[styles.inputWrapper, isModified("contactInfo.country") && styles.modifiedInput]}>
              <Pressable onPress={() => setCountryModalVisible(true)}>
                <View pointerEvents="none">
                  <TextInput
                    mode="outlined"
                    label={t("profileEdit.country")}
                    value={getFieldValue("contactInfo.country")}
                    editable={false}
                    showSoftInputOnFocus={false}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    outlineColor={isModified("contactInfo.country") ? colors.warning : colors.divider}
                    activeOutlineColor={colors.text}
                    right={<TextInput.Icon icon="menu-down" />}
                  />
                </View>
              </Pressable>
              {isModified("contactInfo.country") && (
                <View style={[styles.modifiedIndicator, { backgroundColor: colors.warning }]} />
              )}
            </View>
          </View>
          <View style={styles.rowHalf}>
            <View style={styles.halfInput}>
              {renderInput("contactInfo.state", t("profileEdit.state"))}
            </View>
            <View style={styles.halfInput}>
              {renderInput("contactInfo.zip", t("profileEdit.zip"))}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Phone Section */}
      <Card style={[styles.section, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            {t("profileEdit.phone")}
          </Text>
          <View style={styles.row}>
            {renderPhoneInput("contactInfo.mobilePhone", t("profileEdit.mobilePhone"))}
          </View>
          <View style={styles.row}>
            {renderPhoneInput("contactInfo.homePhone", t("profileEdit.homePhone"))}
          </View>
          <View style={styles.row}>
            {renderPhoneInput("contactInfo.workPhone", t("profileEdit.workPhone"))}
          </View>
        </Card.Content>
      </Card>

      <DatePicker
        modal
        open={showDatePicker}
        date={birthDate}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(date) => {
          setShowDatePicker(false);
          onFieldChange("birthDate", DateHelper.formatHtml5Date(date));
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <CountryPickerModal
        visible={countryModalVisible}
        mode="country"
        selectedCountryName={getFieldValue("contactInfo.country")}
        onClose={() => setCountryModalVisible(false)}
        onSelect={(option) => {
          onFieldChange("contactInfo.country", option.name);
          setCountryModalVisible(false);
        }}
      />

      <CountryPickerModal
        visible={!!activeDialPickerKey}
        mode="dialCode"
        selectedDialCode={activeDialParts?.dialCode}
        onClose={() => setDialPickerKey(null)}
        onSelect={(option) => {
          if (!activeDialPickerKey || !activeDialParts) return;
          setPhoneDialOverrides(prev => ({ ...prev, [activeDialPickerKey]: option.dialCode }));
          onFieldChange(
            activeDialPickerKey,
            formatPhoneNumber(option.dialCode, activeDialParts.national)
          );
          setDialPickerKey(null);
        }}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8
  },
  row: { marginBottom: 12 },
  rowHalf: {
    flexDirection: "row",
    gap: 12
  },
  halfInput: { flex: 1 },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start"
  },
  dialInput: {
    width: 108
  },
  phoneNationalInput: {
    flex: 1
  },
  inputWrapper: { position: "relative" },
  modifiedInput: { borderRadius: 4 },
  modifiedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4
  },
  input: {},
  bottomPadding: { height: 100 }
});
