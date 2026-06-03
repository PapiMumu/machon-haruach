import React, { useCallback } from "react";
import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text } from "react-native-paper";

type PrayerContact = {
  country: string;
  flag: string;
  label: string;
  digits: string;
};

const PRAYER_CONTACTS: PrayerContact[] = [
  { country: "United States", flag: "🇺🇸", label: "+1 448 877 0344", digits: "14488770344" },
  { country: "United Kingdom", flag: "🇬🇧", label: "+44 1244 727242", digits: "441244727242" },
  { country: "Zimbabwe", flag: "🇿🇼", label: "+263 8677 211 645", digits: "2638677211645" },
  { country: "South Africa", flag: "🇿🇦", label: "+27 872 654 913", digits: "27872654913" }
];

export default function PrayerRequestsScreen() {
  const openCall = useCallback(async (digits: string) => {
    await Linking.openURL(`tel:+${digits}`);
  }, []);

  const openWhatsApp = useCallback(async (digits: string) => {
    const text = encodeURIComponent("Hi, I would like to submit a prayer request.");
    await Linking.openURL(`https://wa.me/${digits}?text=${text}`);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.introCard}>
        <Text style={styles.title}>Prayer Requests</Text>
        <Text style={styles.subtitle}>
          Need prayer support? Reach the call center directly by phone or WhatsApp using any of the contacts below.
        </Text>
      </View>

      {PRAYER_CONTACTS.map(contact => (
        <View key={contact.digits} style={styles.contactCard}>
          <Text style={styles.countryText}>
            {contact.flag} {contact.country}
          </Text>
          <Text style={styles.numberText}>{contact.label}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.callButton}
              onPress={() => {
                void openCall(contact.digits);
              }}
            >
              <MaterialIcons name="phone" size={18} color="#1A1A1A" />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.whatsappButton}
              onPress={() => {
                void openWhatsApp(contact.digits);
              }}
            >
              <Image source={require("../../assets/images/whatsapp.png")} style={styles.whatsappIcon} resizeMode="contain" />
              <Text style={styles.whatsappText}>WhatsApp</Text>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 30
  },
  introCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  subtitle: {
    marginTop: 9,
    color: "rgba(255,255,255,0.84)",
    fontSize: 15,
    lineHeight: 22
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4
  },
  countryText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700"
  },
  numberText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3
  },
  callText: {
    color: "#1A1A1A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  whatsappButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  whatsappIcon: {
    width: 18,
    height: 18
  },
  whatsappText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});

