import React, { useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQuery } from "@tanstack/react-query";

import { useThemeColors } from "@/theme";
import { useUser } from "../../src/stores/useUserStore";

interface Group {
  id: string;
  name: string;
  categoryName?: string;
  description?: string;
  labelArray?: string[];
}

const GroupCategoryScreen = () => {
  const tc = useThemeColors();
  const user = useUser();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const selectedCategory = (category || "").toString().trim();

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/groups/my", "MembershipApi"],
    enabled: !!user?.jwt,
    placeholderData: [],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const normalizedCategory = selectedCategory.toLowerCase();
  const visibleGroups = useMemo(() => {
    return groups.filter(group => {
      const groupCategory = (group.categoryName || "").trim().toLowerCase();
      const labels = (group.labelArray || []).map(label => label.trim().toLowerCase());
      return groupCategory === normalizedCategory || labels.includes(normalizedCategory);
    });
  }, [groups, normalizedCategory]);

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={styles.titleWrap}>
        <Text variant="titleLarge" style={[styles.title, { color: tc.text }]}>
          {selectedCategory || "Groups"}
        </Text>
      </View>

      <FlatList
        data={visibleGroups}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text variant="bodyMedium" style={{ color: tc.textSecondary }}>
              No groups found in this category yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardRow}
              activeOpacity={0.85}
              onPress={() => router.push(`/groupDetails/${item.id}`)}>
              <View style={styles.textCol}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle} numberOfLines={2}>
                  {item.description || "Tap to view this group"}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  title: {
    fontWeight: "700"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1A1A",
    marginBottom: 12
  },
  cardRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  textCol: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 4
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18
  },
  emptyWrap: {
    paddingTop: 24
  }
});

export default GroupCategoryScreen;
