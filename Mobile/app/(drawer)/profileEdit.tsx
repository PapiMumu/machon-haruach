import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, Card, Text } from "react-native-paper";
import { LoadingWrapper } from "../../src/components/wrapper/LoadingWrapper";
import { useCurrentUserChurch } from "../../src/stores/useUserStore";
import { UserHelper, membershipPersonSavePayload, postMembershipJson } from "../../src/helpers";
import { loadLinkedPerson } from "../../src/helpers/loadLinkedPerson";
import { useChurchStore } from "../../src/stores/useChurchStore";
import {
  ProfileTabBar,
  ProfileTabSection,
  ProfileEditForm,
  PendingChangesView,
  AccountSettings
} from "../../src/components/profile";
import {
  PersonInterface,
  ProfileChange,
  fieldDefinitions
} from "../../src/interfaces";
import { useTranslation } from "react-i18next";
import { useFormWithDirtyTracking } from "../../src/hooks/useFormWithDirtyTracking";
import { isProfileIncomplete } from "../../src/helpers/profileCompletion";
import { useThemeColors } from "../../src/theme";

const ProfileEdit = () => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const pageBackground = colors.isDark ? colors.black : colors.background;
  const currentUserChurch = useCurrentUserChurch();
  const setCurrentUserChurch = useChurchStore((state) => state.setCurrentUserChurch);
  const queryClient = useQueryClient();
  const person = currentUserChurch?.person;
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<ProfileTabSection>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFieldValue = useCallback((obj: PersonInterface, key: string): string => {
    const parts = key.split(".");
    let value: any = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    if (key === "birthDate" && value) {
      return new Date(value).toISOString().split("T")[0];
    }
    return value || "";
  }, []);

  const setFieldValue = useCallback((obj: PersonInterface, key: string, value: string): PersonInterface => {
    const newObj = JSON.parse(JSON.stringify(obj));
    const parts = key.split(".");
    let target: any = newObj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
    return newObj;
  }, []);

  const form = useFormWithDirtyTracking<PersonInterface>({ getFieldValue, setFieldValue });
  const { editedData: editedPerson, setEditedData: setEditedPerson, modifiedFields, setModifiedFields, handleFieldChange } = form;

  // Fetch full person data
  const { data: personData, isLoading } = useQuery<PersonInterface>({
    queryKey: [`/people/${person?.id}`, "MembershipApi"],
    enabled: !!person?.id && !!currentUserChurch?.jwt && isFocused,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Fallback for newly created accounts where person.id is not hydrated yet.
  const { data: claimedPersonData, isLoading: isClaimLoading } = useQuery<{ person: PersonInterface }>({
    queryKey: [`/people/claim/${currentUserChurch?.church?.id}`, "MembershipApi", "profileEditFallback"],
    enabled: !person?.id && !!currentUserChurch?.jwt && !!currentUserChurch?.church?.id && isFocused,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  useEffect(() => {
    UserHelper.addOpenScreenEvent("Profile Edit Screen");
  }, []);

  useEffect(() => {
    if (editedPerson) return;

    if (personData) {
      form.initialize(personData);
      return;
    }

    if (claimedPersonData?.person) {
      form.initialize(claimedPersonData.person);
      return;
    }

    // Last-resort bootstrap from store data so the screen never renders empty.
    if (person) {
      form.initialize({
        ...person,
        name: person.name || {},
        contactInfo: person.contactInfo || {}
      } as PersonInterface);
    }
  }, [personData, claimedPersonData, person, editedPerson]);

  const handlePhotoChange = (photoUri: string) => {
    if (!editedPerson) return;
    setEditedPerson({ ...editedPerson, photo: photoUri });
    form.markFieldModified("photo");
  };

  const buildChanges = (): ProfileChange[] => {
    const changes: ProfileChange[] = [];

    modifiedFields.forEach((key) => {
      const fieldDef = fieldDefinitions.find((f) => f.key === key);
      if (fieldDef && editedPerson) {
        changes.push({
          field: key,
          label: fieldDef.label,
          value: key === "photo" ? editedPerson.photo || "" : form.getField(key)
        });
      }
    });

    return changes;
  };

  const handleSubmit = async () => {
    const changes = buildChanges();
    if (changes.length === 0 || !editedPerson?.id) return;

    setIsSubmitting(true);

    try {
      const churchId = currentUserChurch?.church?.id;
      if (!churchId) {
        throw new Error("Church is not selected.");
      }

      const linkedPerson = await loadLinkedPerson(churchId, editedPerson);
      const personToSave: PersonInterface = {
        ...linkedPerson,
        ...editedPerson,
        id: linkedPerson.id || editedPerson.id,
        name: editedPerson.name || linkedPerson.name,
        contactInfo: { ...(linkedPerson.contactInfo || {}), ...(editedPerson.contactInfo || {}) }
      };

      const payload = membershipPersonSavePayload(personToSave, personToSave.contactInfo || {});
      const saved = (await postMembershipJson("/people", [payload], "MembershipApi")) as PersonInterface | PersonInterface[];
      const updatedPerson = Array.isArray(saved) ? saved[0] : saved;

      if (updatedPerson && currentUserChurch) {
        await setCurrentUserChurch({ ...currentUserChurch, person: updatedPerson });
        form.initialize(updatedPerson);
      } else {
        form.initialize(editedPerson);
      }

      await useChurchStore.getState().refreshMembershipGroups();
      await queryClient.invalidateQueries({ queryKey: [`/people/${personToSave.id}`, "MembershipApi"] });

      Alert.alert(
        t("common.success"),
        t("profileEdit.profileSaved"),
        [{ text: t("common.ok"), onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      const message = error instanceof Error ? error.message : t("profileEdit.submitError");
      Alert.alert(t("common.error"), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (form.hasChanges) {
      Alert.alert(
        t("profileEdit.discardChanges"),
        t("profileEdit.discardChangesMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("profileEdit.discard"),
            style: "destructive",
            onPress: () => {
              form.resetForm();
            }
          }
        ]
      );
    }
  };

  const hasChanges = form.hasChanges;
  const changes = buildChanges();
  const showOnboardingBanner = isProfileIncomplete(currentUserChurch);

  const renderContent = () => {
    if (!editedPerson) return null;

    switch (activeTab) {
      case "profile":
        return (
          <ProfileEditForm
            person={editedPerson}
            modifiedFields={modifiedFields}
            onFieldChange={handleFieldChange}
            onPhotoChange={handlePhotoChange}
          />
        );
      case "account": return <AccountSettings />;
      default: return null;
    }
  };

  return (
    <SafeAreaProvider>
      <LoadingWrapper loading={isLoading || isClaimLoading}>
        <View style={[styles.container, { backgroundColor: pageBackground }]}>
          {!showOnboardingBanner && (
            <ProfileTabBar
              activeSection={activeTab}
              onTabChange={setActiveTab}
              hasChanges={hasChanges}
            />
          )}

          {showOnboardingBanner && (
            <View style={styles.bannerWrap}>
              <Card style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Card.Content>
                  <Text variant="titleMedium" style={[styles.bannerTitle, { color: colors.text }]}>
                    {t("profileEdit.newMemberBannerTitle", "Complete your profile")}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.bannerBody, { color: colors.disabled }]}>
                    {t("profileEdit.newMemberBannerMessage", "Please complete your profile details by joining a group in the Groups page so you can fully connect and participate.")}
                  </Text>
                  <View style={styles.bannerActions}>
                    <Button
                      mode="contained"
                      onPress={() => router.push("/(drawer)/(tabs)/myGroups")}
                      style={styles.bannerActionButton}
                      buttonColor={colors.text}
                      textColor="#111111"
                      labelStyle={styles.bannerActionButtonText}>
                      {t("profileEdit.joinGroup", "Join Group")}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </View>
          )}

          <View style={styles.content}>
            {renderContent()}
          </View>

          {/* Pending Changes Footer */}
          {hasChanges && (
            <PendingChangesView
              changes={changes}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          )}
        </View>
      </LoadingWrapper>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10
  },
  bannerCard: {
    borderWidth: 1
  },
  bannerTitle: {
    fontWeight: "700",
    marginBottom: 6
  },
  bannerBody: {
    marginBottom: 12
  },
  bannerActions: {
    flexDirection: "row",
    gap: 10
  },
  bannerActionButton: {
    flex: 1
  },
  bannerActionButtonText: {
    fontWeight: "700"
  },
  content: { flex: 1 }
});

export default ProfileEdit;
