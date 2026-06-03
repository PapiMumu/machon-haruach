import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useThemeColors } from "@/theme";

const CATEGORY_OPTIONS = ["Young Adults", "Men", "Women", "Youth", "Family", "Prayer"];

const GroupCategoriesScreen = () => {
  const tc = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={styles.contentWrap}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: tc.text }]}>
          Group Categories
        </Text>
        <View style={styles.categoryCard}>
          {CATEGORY_OPTIONS.map((option, index) => (
            <View key={option}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.categoryRow}
                onPress={() =>
                  router.push({
                    pathname: "/(drawer)/groupCategory",
                    params: { category: option }
                  })
                }>
                <View style={styles.categoryTextCol}>
                  <Text variant="titleMedium" style={styles.categoryTitle}>
                    {option}
                  </Text>
                  <Text variant="bodySmall" style={styles.categorySubtitle}>
                    Tap to open the {option} page
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.45)" />
              </TouchableOpacity>
              {index < CATEGORY_OPTIONS.length - 1 ? <View style={styles.categoryDivider} /> : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionTitle: {
    color: "#3c3c3c",
    fontWeight: "600",
    marginBottom: 16,
    paddingLeft: 4
  },
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1A1A"
  },
  categoryRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  categoryTextCol: { flex: 1, minWidth: 0 },
  categoryTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 4
  },
  categorySubtitle: {
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18
  },
  categoryDivider: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.1)"
  }
});

export default GroupCategoriesScreen;
