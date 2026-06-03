import React, { useLayoutEffect, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

import { givingBody, givingCaption, givingSectionHeading } from "../../src/components/donations/givingTypography";
import { ApiHelper } from "@machonharuach/helpers";
import { membershipPersonSavePayload, postMembershipJson } from "../../src/helpers";
import { queryClient } from "../../src/helpers/QueryClient";
import { useCurrentUserChurch } from "../../src/stores/useUserStore";

/** Slightly larger than shared giving scales — this screen only. */
const joinSectionHeading: TextStyle = {
  ...givingSectionHeading,
  fontSize: 18,
  lineHeight: 26
};
const joinBody: TextStyle = { ...givingBody, fontSize: 16, lineHeight: 22 };
const joinCaption: TextStyle = { ...givingCaption, fontSize: 14, lineHeight: 20 };

type ExpandedSection = "where" | "who";

/** ISO region codes — same coverage as Admin group country field. */
const COUNTRY_CODES = [
  "ZW", "ZM", "ZA", "BW", "NA", "MZ", "MW", "TZ", "KE", "UG", "RW", "BI", "NG", "GH", "ET", "EG", "SD", "AO", "CD", "CM", "SN", "CI", "DZ",
  "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "UY", "VE",
  "GB", "IE", "FR", "DE", "NL", "BE", "ES", "PT", "IT", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "RO", "GR", "UA", "RU",
  "AE", "SA", "QA", "KW", "OM", "BH", "IL", "TR", "IN", "PK", "BD", "LK", "NP", "CN", "JP", "KR", "SG", "MY", "TH", "VN", "PH", "ID",
  "AU", "NZ"
] as const;

/** Full English names — RN/Hermes often lacks `Intl.DisplayNames` for regions, which would otherwise show ISO codes. */
const COUNTRY_ENGLISH_NAMES: Record<string, string> = {
  ZW: "Zimbabwe",
  ZM: "Zambia",
  ZA: "South Africa",
  BW: "Botswana",
  NA: "Namibia",
  MZ: "Mozambique",
  MW: "Malawi",
  TZ: "Tanzania",
  KE: "Kenya",
  UG: "Uganda",
  RW: "Rwanda",
  BI: "Burundi",
  NG: "Nigeria",
  GH: "Ghana",
  ET: "Ethiopia",
  EG: "Egypt",
  SD: "Sudan",
  AO: "Angola",
  CD: "Democratic Republic of the Congo",
  CM: "Cameroon",
  SN: "Senegal",
  CI: "Côte d'Ivoire",
  DZ: "Algeria",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  UY: "Uruguay",
  VE: "Venezuela",
  GB: "United Kingdom",
  IE: "Ireland",
  FR: "France",
  DE: "Germany",
  NL: "Netherlands",
  BE: "Belgium",
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  HU: "Hungary",
  RO: "Romania",
  GR: "Greece",
  UA: "Ukraine",
  RU: "Russia",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  OM: "Oman",
  BH: "Bahrain",
  IL: "Israel",
  TR: "Turkey",
  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  ID: "Indonesia",
  AU: "Australia",
  NZ: "New Zealand"
};

/** Same seed list as Admin `GroupAdd` `CATEGORY_SUGGESTIONS`, with "Ministry" omitted for standard (cell) groups. */
const GROUP_CATEGORY_OPTIONS = ["Cell Groups", "Young Adults", "Men", "Women", "Youth", "Family", "Prayer"] as const;

const GroupJoinScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currentUserChurch = useCurrentUserChurch();
  const [nextBusy, setNextBusy] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>("where");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countryPickerQuery, setCountryPickerQuery] = useState("");
  const [groupCategory, setGroupCategory] = useState<(typeof GROUP_CATEGORY_OPTIONS)[number] | null>(null);

  const countryOptions = useMemo(() => {
    let intlOf: ((code: string) => string | undefined) | undefined;
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      intlOf = (code: string) => {
        const n = dn.of(code);
        return n && n.length > 2 && n !== code ? n : undefined;
      };
    }
    return [...COUNTRY_CODES]
      .map(code => ({
        code,
        name: COUNTRY_ENGLISH_NAMES[code] ?? intlOf?.(code) ?? code
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredCountryOptions = useMemo(() => {
    const q = countryPickerQuery.trim().toLowerCase();
    if (!q) return countryOptions;
    return countryOptions.filter(item => item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q));
  }, [countryOptions, countryPickerQuery]);

  useFocusEffect(
    useCallback(() => {
      const ci = currentUserChurch?.person?.contactInfo;
      if (!ci) return;

      setAddress1(ci.address1 || "");
      setAddress2(ci.address2 || "");
      setCity(ci.city || "");
      setCountry(ci.country || "");
    }, [currentUserChurch?.person?.contactInfo])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      title: ""
    });
  }, [navigation]);

  const handleNext = useCallback(async () => {
    Keyboard.dismiss();
    const a1 = address1.trim();
    const c = city.trim();
    const co = country.trim();
    if (!a1 || !c || !co) {
      Alert.alert("Address needed", "Please enter Address 1, City, and Country. We use your address with your request; cell meeting places are chosen on the next screen.");
      return;
    }

    const churchId = currentUserChurch?.church?.id;
    const person = currentUserChurch?.person;
    if (churchId && person?.id) {
      setNextBusy(true);
      try {
        let savePerson = person;
        try {
          const claim = (await ApiHelper.get(`/people/claim/${churchId}`, "MembershipApi")) as { person?: typeof person };
          if (claim?.person?.id) {
            savePerson = { ...person, id: claim.person.id };
          }
        } catch (claimError) {
          console.warn("Claim person before join address save failed:", claimError);
        }

        const payload = membershipPersonSavePayload(savePerson, {
          address1: a1,
          address2: address2.trim() || undefined,
          city: c,
          country: co
        });
        await postMembershipJson("/people", [payload], "MembershipApi");
        queryClient.invalidateQueries({ queryKey: [`/people/${person.id}`, "MembershipApi"] });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("Save member address from Join Group failed:", msg);
        Alert.alert("Could not save address", msg || "Please check your connection and try again.");
        return;
      } finally {
        setNextBusy(false);
      }
    }

    router.push({
      pathname: "/(drawer)/browseGroups",
      ...(groupCategory ? { params: { interestCategory: groupCategory } } : {})
    });
  }, [address1, address2, city, country, currentUserChurch?.person, groupCategory, router]);

  const handleReset = useCallback(() => {
    TextInput.State.blurTextInput();
    Keyboard.dismiss();
    setAddress1("");
    setAddress2("");
    setCity("");
    setCountry("");
    setCountryModalVisible(false);
    setCountryPickerQuery("");
    setGroupCategory(null);
    setExpandedSection("where");
  }, []);

  const renderChip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label} activeOpacity={0.85} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, joinBody, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const collapsedCard = (section: ExpandedSection, title: string, subtitle: string) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedSection(section)} style={styles.sectionCardCompact}>
      <Text style={[styles.collapsedTitle, joinSectionHeading]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, joinCaption]}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button">
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="always"
          removeClippedSubviews={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          {expandedSection === "where" ? (
            <View style={styles.sectionCard}>
              <TouchableOpacity activeOpacity={0.95} onPress={() => setExpandedSection("where")}>
                <Text style={[styles.sectionTitleExpanded, joinSectionHeading]}>Where?</Text>
              </TouchableOpacity>

              <View style={[styles.searchRow, styles.addressFieldRow]}>
                <MaterialIcons name="home" size={20} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={address1}
                  onChangeText={setAddress1}
                  placeholder="Address 1"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={[styles.searchInput, joinBody]}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.searchRow, styles.addressFieldRow]}>
                <MaterialIcons name="home" size={20} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={address2}
                  onChangeText={setAddress2}
                  placeholder="Address 2"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={[styles.searchInput, joinBody]}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.searchRow, styles.addressFieldRow]}>
                <MaterialIcons name="location-city" size={20} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={[styles.searchInput, joinBody]}
                  autoCapitalize="words"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.searchRow}
                onPress={() => {
                  setCountryPickerQuery("");
                  setCountryModalVisible(true);
                }}>
                <MaterialIcons name="public" size={20} color="rgba(255,255,255,0.45)" />
                <Text
                  numberOfLines={1}
                  style={[styles.countryFieldText, joinBody, !country && styles.countryFieldPlaceholder]}>
                  {country || "Country"}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={22} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>

              <View style={styles.addressNotice}>
                <MaterialIcons name="info-outline" size={20} color="rgba(255,255,255,0.65)" style={styles.addressNoticeIcon} />
                <Text style={[styles.addressNoticeText, joinCaption]}>
                  Enter your address so that the church can reach you. Next, you will choose the cell group you want to join.
                </Text>
              </View>
            </View>
          ) : (
            collapsedCard("where", "Where", "Where you'll be")
          )}

          {expandedSection === "who" ? (
            <View style={styles.sectionCard}>
              <TouchableOpacity activeOpacity={0.95} onPress={() => setExpandedSection("who")}>
                <Text style={[joinSectionHeading, styles.whoMainTitle]}>Who?</Text>
              </TouchableOpacity>

              <Text style={[styles.subheading, joinBody]}>I want to join a group for...</Text>
              <View style={styles.chipRow}>
                {GROUP_CATEGORY_OPTIONS.map(opt =>
                  renderChip(opt, groupCategory === opt, () => setGroupCategory(groupCategory === opt ? null : opt))
                )}
              </View>
            </View>
          ) : (
            collapsedCard("who", "Who", "Who you'll meet")
          )}
        </ScrollView>

        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity activeOpacity={0.85} style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.nextButton, nextBusy && styles.nextButtonBusy]}
            onPress={() => void handleNext()}
            disabled={nextBusy}>
            {nextBusy ? <ActivityIndicator color="#111111" /> : <Text style={styles.nextButtonText}>Next</Text>}
          </TouchableOpacity>
        </View>

        <Modal visible={countryModalVisible} animationType="slide" transparent onRequestClose={() => setCountryModalVisible(false)}>
          <View style={styles.countryModalRoot}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.countryModalBackdrop}
              onPress={() => {
                setCountryModalVisible(false);
                setCountryPickerQuery("");
              }}
            />
            <View style={[styles.countryModalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.countryModalHeader}>
                <Text style={[styles.countryModalTitle, joinSectionHeading]}>Select country</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCountryModalVisible(false);
                    setCountryPickerQuery("");
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.countryModalSearchRow}>
                <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={countryPickerQuery}
                  onChangeText={setCountryPickerQuery}
                  placeholder="Search countries"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={[styles.countryModalSearchInput, joinBody]}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              <FlatList
                data={filteredCountryOptions}
                keyExtractor={item => item.code}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: Dimensions.get("window").height * 0.52 }}
                renderItem={({ item }) => {
                  const selected = country === item.name;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.countryRow, selected && styles.countryRowSelected]}
                      onPress={() => {
                        setCountry(item.name);
                        setCountryModalVisible(false);
                        setCountryPickerQuery("");
                      }}>
                      <Image
                        source={{ uri: `https://flagcdn.com/w40/${item.code.toLowerCase()}.png` }}
                        style={styles.countryFlag}
                        resizeMode="cover"
                      />
                      <Text style={[styles.countryRowName, joinBody]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {selected ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000"
  },
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 4,
    marginBottom: 10
  },
  /** Icon-only back control — matches drawer `My Giving` header chevron (no circular background). */
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginLeft: -4,
    justifyContent: "center",
    alignItems: "center"
  },
  scrollContent: {
    paddingHorizontal: 16
  },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    marginBottom: 12
  },
  sectionCardCompact: {
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12
  },
  collapsedTitle: {
    color: "#FFFFFF",
    marginBottom: 4
  },
  sectionTitleExpanded: {
    color: "#FFFFFF",
    marginBottom: 10
  },
  whoMainTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 14
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.65)",
    marginTop: -2
  },
  subheading: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 10
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 0
  },
  chipSelected: {
    backgroundColor: "#F3F6FD",
    borderColor: "#F3F6FD"
  },
  chipText: {
    color: "#FFFFFF"
  },
  /** Same treatment as `nextButtonText` / `nextButton` for a clear “primary” selected state. */
  chipTextSelected: {
    color: "#111111",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    marginBottom: 12
  },
  addressFieldRow: {
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 10,
    marginLeft: 8
  },
  countryFieldText: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 10,
    marginLeft: 8
  },
  countryFieldPlaceholder: {
    color: "rgba(255,255,255,0.45)"
  },
  countryModalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  countryModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  countryModalSheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: "78%",
    paddingHorizontal: 16,
    paddingTop: 12
  },
  countryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  countryModalTitle: {
    color: "#FFFFFF"
  },
  countryModalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    marginBottom: 10
  },
  countryModalSearchInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 10,
    marginLeft: 8
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  countryRowSelected: {
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  countryFlag: {
    width: 32,
    height: 22,
    borderRadius: 3,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  countryRowName: {
    flex: 1,
    color: "#FFFFFF"
  },
  addressNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingVertical: 4
  },
  addressNoticeIcon: {
    marginRight: 10,
    marginTop: 2
  },
  addressNoticeText: {
    color: "rgba(255,255,255,0.72)",
    flex: 1,
    textAlign: "justify"
  },
  /** Reset / Next only — no background panel; sits on the screen `#000` like the rest of the page. */
  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16
  },
  resetButton: {
    width: 100,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  resetButtonText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  },
  nextButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#F3F6FD",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 48
  },
  nextButtonBusy: {
    opacity: 0.9
  },
  nextButtonText: {
    color: "#111111",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  }
});

export default GroupJoinScreen;
