import React from "react";
import { View, StyleSheet, FlatList, ListRenderItem } from "react-native";
import { Text } from "react-native-paper";

interface MediaHorizontalRowProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  emptyComponent?: React.ReactNode;
}

export function MediaHorizontalRow<T>({ title, subtitle, data, keyExtractor, renderItem, emptyComponent }: MediaHorizontalRowProps<T>) {
  if (data.length === 0) {
    return emptyComponent ? <View style={styles.wrap}>{emptyComponent}</View> : null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 26 },
  header: {
    paddingHorizontal: 16,
    marginBottom: 14
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingRight: 8
  },
  separator: { width: 10 }
});
