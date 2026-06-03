import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, TextInput, Button, Card, IconButton, Switch } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { PersonInterface, PendingHouseholdMemberRequest, HouseholdRelationship } from "../../interfaces";
import { Avatar } from "../common/Avatar";
import { LoadingWrapper } from "../wrapper/LoadingWrapper";
import { useCurrentUserChurch } from "../../stores/useUserStore";
import { ApiHelper } from "@machonharuach/helpers";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../theme";

interface HouseholdEditProps {
  householdId?: string;
  currentPersonId?: string;
  pendingFamilyMembers: PendingHouseholdMemberRequest[];
  onFamilyMembersChange: (members: PendingHouseholdMemberRequest[]) => void;
}

export const HouseholdEdit: React.FC<HouseholdEditProps> = ({
  householdId,
  currentPersonId,
  pendingFamilyMembers,
  onFamilyMembersChange
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [relationship, setRelationship] = useState<HouseholdRelationship>("Other");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [hasMobileDevice, setHasMobileDevice] = useState(true);
  const [canSelfCheckIn, setCanSelfCheckIn] = useState(false);
  const [notes, setNotes] = useState("");
  const [registeredPersonId, setRegisteredPersonId] = useState<string | undefined>();
  const [registeredDisplayName, setRegisteredDisplayName] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PersonInterface[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const currentUserChurch = useCurrentUserChurch();
  const relationshipOptions: HouseholdRelationship[] = ["Spouse", "Child", "Parent", "Other"];

  const { data: householdMembers = [], isLoading } = useQuery<PersonInterface[]>({
    queryKey: [`/people/household/${householdId}`, "MembershipApi"],
    enabled: !!householdId && !!currentUserChurch?.jwt,
    placeholderData: [],
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });

  const handleAddMember = () => {
    const firstName = newMemberFirstName.trim();
    const lastName = newMemberLastName.trim();
    if (firstName) {
      const pendingRequest: PendingHouseholdMemberRequest = {
        firstName,
        lastName,
        relationship,
        alreadyRegistered,
        registeredPersonId,
        registeredDisplayName,
        registeredEmail,
        hasMobileDevice,
        canSelfCheckIn,
        notes: notes.trim()
      };
      onFamilyMembersChange([...pendingFamilyMembers, pendingRequest]);
      setNewMemberFirstName("");
      setNewMemberLastName("");
      setRelationship("Other");
      setAlreadyRegistered(false);
      setHasMobileDevice(true);
      setCanSelfCheckIn(false);
      setNotes("");
      setRegisteredPersonId(undefined);
      setRegisteredDisplayName("");
      setRegisteredEmail("");
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  const handleSearchRegisteredMembers = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setIsSearching(true);
    setSearchError("");
    try {
      let results: PersonInterface[] = [];
      try {
        // Some environments support querystring search.
        results = await ApiHelper.get(`/people/search?term=${encodeURIComponent(term)}`, "MembershipApi");
      } catch (getError) {
        // Fallback for environments expecting POST payload.
        results = await ApiHelper.post("/people/search", { term }, "MembershipApi");
      }
      const filtered = (results || []).filter((p: PersonInterface) => p.id && p.id !== currentPersonId);
      setSearchResults(filtered);
    } catch (error) {
      // Avoid noisy redbox logs for expected permission-limited scenarios.
      setSearchResults([]);
      setSearchError(t("profileEdit.memberSearchFailed"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRegisteredMember = (person: PersonInterface) => {
    setAlreadyRegistered(true);
    setRegisteredPersonId(person.id);
    setRegisteredDisplayName(person.name?.display || [person.name?.first, person.name?.last].filter(Boolean).join(" "));
    setRegisteredEmail(person.contactInfo?.email || "");
    setNewMemberFirstName(person.name?.first || "");
    setNewMemberLastName(person.name?.last || "");
    setSearchResults([]);
    setSearchTerm(person.name?.display || "");
  };

  const handleAlreadyRegisteredChange = (value: boolean) => {
    setAlreadyRegistered(value);
    if (!value) {
      setRegisteredPersonId(undefined);
      setRegisteredDisplayName("");
      setRegisteredEmail("");
      setSearchTerm("");
      setSearchResults([]);
      setSearchError("");
    }
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = [...pendingFamilyMembers];
    newMembers.splice(index, 1);
    onFamilyMembersChange(newMembers);
  };

  const otherMembers = householdMembers.filter(m => m.id !== currentPersonId);

  return (
    <LoadingWrapper loading={isLoading}>
      <View style={styles.container}>
        {/* Current Household Members */}
        <Card style={[styles.section, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <MaterialIcons name="people" size={24} color={colors.text} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                {t("profileEdit.currentHousehold")}
              </Text>
            </View>

            {otherMembers.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.disabled }]}>
                {t("profileEdit.noOtherHouseholdMembers")}
              </Text>
            ) : (
              otherMembers.map((member) => (
                <View key={member.id} style={[styles.memberItem, { borderBottomColor: colors.border }]}>
                  <Avatar
                    size={48}
                    photoUrl={member.photo}
                    firstName={member.name?.first}
                    lastName={member.name?.last}
                  />
                  <View style={styles.memberInfo}>
                    <Text variant="titleSmall" style={[styles.memberName, { color: colors.text }]}>
                      {member.name?.display}
                    </Text>
                    {member.householdRole && (
                      <Text variant="bodySmall" style={[styles.memberRole, { color: colors.disabled }]}>
                        {member.householdRole}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Add Family Member */}
        <Card style={[styles.section, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <MaterialIcons name="person-add" size={24} color={colors.text} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                {t("profileEdit.addFamilyMember")}
              </Text>
            </View>

            <Text variant="bodySmall" style={[styles.helperText, { color: colors.disabled }]}>
              {t("profileEdit.addFamilyMemberDescription")}
            </Text>

            <View style={styles.nameRow}>
              <TextInput
                mode="outlined"
                label={t("profileEdit.firstName")}
                value={newMemberFirstName}
                onChangeText={(text) => {
                  setNewMemberFirstName(text);
                  if (registeredPersonId) setRegisteredPersonId(undefined);
                }}
                style={[styles.nameInput, { backgroundColor: colors.surface }]}
                outlineColor={colors.divider}
                activeOutlineColor={colors.text}
              />
              <TextInput
                mode="outlined"
                label={t("profileEdit.lastName")}
                value={newMemberLastName}
                onChangeText={(text) => {
                  setNewMemberLastName(text);
                  if (registeredPersonId) setRegisteredPersonId(undefined);
                }}
                style={[styles.nameInput, { backgroundColor: colors.surface }]}
                outlineColor={colors.divider}
                activeOutlineColor={colors.text}
              />
            </View>

            <Text variant="labelMedium" style={[styles.controlLabel, { color: colors.text }]}>
              {t("profileEdit.relationship")}
            </Text>
            <View style={styles.relationshipRow}>
              {relationshipOptions.map((option) => (
                <Button
                  key={option}
                  mode={relationship === option ? "contained" : "outlined"}
                  onPress={() => setRelationship(option)}
                  style={styles.relationshipButton}
                  buttonColor={relationship === option ? colors.text : "transparent"}
                  textColor={relationship === option ? "#111111" : colors.text}>
                  {option}
                </Button>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text variant="bodyMedium" style={[styles.toggleLabel, { color: colors.text }]}>
                {t("profileEdit.alreadyRegistered")}
              </Text>
              <Switch value={alreadyRegistered} onValueChange={handleAlreadyRegisteredChange} color={colors.text} />
            </View>
            <Text variant="bodySmall" style={[styles.guidanceText, { color: colors.disabled }]}>
              {t("profileEdit.householdAccountGuidance")}
            </Text>

            {alreadyRegistered && (
              <View style={styles.searchSection}>
                <Text variant="labelMedium" style={[styles.controlLabel, styles.searchLabel, { color: colors.text }]}>
                  {t("profileEdit.searchRegisteredMember")}
                </Text>
                <View style={styles.searchRow}>
                  <TextInput
                    mode="outlined"
                    value={searchTerm}
                    onChangeText={(text) => {
                      setSearchTerm(text);
                      if (searchError) setSearchError("");
                    }}
                    placeholder={t("profileEdit.searchByNameOrEmail")}
                    style={[styles.searchInput, { backgroundColor: colors.surface }]}
                    outlineColor={colors.divider}
                    activeOutlineColor={colors.text}
                  />
                  <Button
                    mode="contained"
                    onPress={handleSearchRegisteredMembers}
                    loading={isSearching}
                    disabled={isSearching || !searchTerm.trim()}
                    buttonColor={colors.text}
                    textColor="#111111"
                    style={styles.searchButton}>
                    {t("common.search")}
                  </Button>
                </View>
                {!!searchError && (
                  <Text variant="bodySmall" style={[styles.searchErrorText, { color: colors.error }]}>
                    {searchError}
                  </Text>
                )}

                {searchResults.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={[styles.searchResultItem, { borderColor: colors.border }]}
                    onPress={() => handleSelectRegisteredMember(person)}
                    activeOpacity={0.8}>
                    <View style={styles.searchResultInfo}>
                      <Text variant="bodyMedium" style={{ color: colors.text }}>
                        {person.name?.display || [person.name?.first, person.name?.last].filter(Boolean).join(" ")}
                      </Text>
                      {person.contactInfo?.email && (
                        <Text variant="bodySmall" style={{ color: colors.disabled }}>
                          {person.contactInfo.email}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.text} />
                  </TouchableOpacity>
                ))}

                {!!registeredPersonId && (
                  <View style={[styles.selectedRegisteredCard, { borderColor: colors.border }]}>
                    <Text variant="bodyMedium" style={{ color: colors.text }}>
                      {t("profileEdit.selectedRegisteredMember")}: {registeredDisplayName}
                    </Text>
                    {!!registeredEmail && (
                      <Text variant="bodySmall" style={{ color: colors.disabled }}>
                        {registeredEmail}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
            <View style={styles.toggleRow}>
              <Text variant="bodyMedium" style={[styles.toggleLabel, { color: colors.text }]}>
                {t("profileEdit.hasMobileDevice")}
              </Text>
              <Switch value={hasMobileDevice} onValueChange={setHasMobileDevice} color={colors.text} />
            </View>
            <View style={styles.toggleRow}>
              <Text variant="bodyMedium" style={[styles.toggleLabel, { color: colors.text }]}>
                {t("profileEdit.canSelfCheckIn")}
              </Text>
              <Switch value={canSelfCheckIn} onValueChange={setCanSelfCheckIn} color={colors.text} />
            </View>

            <TextInput
              mode="outlined"
              label={t("profileEdit.householdNotes")}
              value={notes}
              onChangeText={setNotes}
              style={[styles.notesInput, { backgroundColor: colors.surface }]}
              multiline
              numberOfLines={3}
              outlineColor={colors.divider}
              activeOutlineColor={colors.text}
            />

            <View style={styles.addButtonRow}>
              <Button
                mode="contained"
                onPress={handleAddMember}
                disabled={!newMemberFirstName.trim() || (alreadyRegistered && !registeredPersonId)}
                style={styles.addButton}
                buttonColor={colors.text}
                textColor="#111111"
                contentStyle={styles.addButtonContent}>
                {t("common.add")}
              </Button>
            </View>

            {/* Pending Family Members */}
            {pendingFamilyMembers.length > 0 && (
              <View style={[styles.pendingSection, { borderTopColor: colors.warningLight }]}>
                <Text variant="labelLarge" style={[styles.pendingLabel, { color: colors.text }]}>
                  {t("profileEdit.pendingFamilyMembers")}
                </Text>
                {pendingFamilyMembers.map((member, index) => (
                  <View key={index} style={[styles.pendingItem, { backgroundColor: colors.warningLight }]}>
                    <View style={styles.pendingIcon}>
                      <MaterialIcons name="person-outline" size={20} color={colors.warning} />
                    </View>
                    <View style={styles.pendingDetails}>
                      <Text variant="bodyMedium" style={[styles.pendingName, { color: colors.text }]}>
                        {[member.firstName, member.lastName].filter(Boolean).join(" ")}
                      </Text>
                      <Text variant="bodySmall" style={[styles.pendingMeta, { color: colors.disabled }]}>
                        {member.relationship} - {member.alreadyRegistered ? t("profileEdit.registeredMember") : t("profileEdit.newDependent")}
                      </Text>
                      {member.alreadyRegistered && !!member.registeredDisplayName && (
                        <Text variant="bodySmall" style={[styles.pendingMeta, { color: colors.disabled }]}>
                          {t("profileEdit.selectedRegisteredMember")}: {member.registeredDisplayName}{member.registeredEmail ? ` (${member.registeredEmail})` : ""}
                        </Text>
                      )}
                      <Text variant="bodySmall" style={[styles.pendingMeta, { color: colors.disabled }]}>
                        {t("profileEdit.hasMobileDevice")}: {member.hasMobileDevice ? t("common.yes") : t("common.no")} | {t("profileEdit.canSelfCheckIn")}: {member.canSelfCheckIn ? t("common.yes") : t("common.no")}
                      </Text>
                    </View>
                    <IconButton
                      icon="close"
                      size={20}
                      iconColor={colors.error}
                      onPress={() => handleRemoveMember(index)}
                      style={styles.removeButton}
                    />
                  </View>
                ))}
                <Text variant="bodySmall" style={[styles.pendingNote, { color: colors.disabled }]}>
                  {t("profileEdit.pendingMembersNote")}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    </LoadingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8
  },
  sectionTitle: { fontWeight: "600" },
  emptyText: {
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1
  },
  memberName: { fontWeight: "600" },
  memberRole: {},
  helperText: { marginBottom: 16 },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  controlLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontWeight: "600"
  },
  relationshipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  relationshipButton: {
    minWidth: 86
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  toggleLabel: {
    flex: 1
  },
  guidanceText: {
    marginBottom: 10
  },
  searchSection: {
    marginBottom: 10
  },
  searchLabel: {
    marginTop: 0
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  searchInput: {
    flex: 1
  },
  searchButton: {
    marginTop: 4
  },
  searchResultItem: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  searchResultInfo: {
    flex: 1,
    paddingRight: 8
  },
  selectedRegisteredCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchErrorText: {
    marginTop: 8
  },
  notesInput: {
    marginTop: 8
  },
  addButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10
  },
  nameInput: { flex: 1 },
  addButton: { marginTop: 6 },
  addButtonContent: { paddingHorizontal: 8 },
  pendingSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1
  },
  pendingLabel: {
    fontWeight: "600",
    marginBottom: 12
  },
  pendingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8
  },
  pendingIcon: { marginRight: 8 },
  pendingDetails: { flex: 1 },
  pendingName: { fontWeight: "600" },
  pendingMeta: { marginTop: 2 },
  removeButton: { margin: 0 },
  pendingNote: {
    fontStyle: "italic",
    marginTop: 8
  }
});
