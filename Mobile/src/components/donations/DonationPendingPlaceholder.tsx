import React from "react";
import { View, StyleSheet } from "react-native";

/** Shown when Stripe / gateway is not ready yet (same layout as donation tab). */
export function DonationPendingPlaceholder() {
  return (
    <View style={styles.pendingWrap}>
      <View style={styles.pendingCard}>
        <View style={styles.pendingIcon}>
          <View style={styles.pendingDot} />
        </View>
        <View style={styles.pendingTextWrap}>
          <View style={styles.pendingTitleRow}>
            <View style={styles.pendingTitleBar} />
          </View>
          <View style={styles.pendingSubBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingWrap: { paddingTop: 10 },
  pendingCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1A1A",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6
  },
  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7FA6FF"
  },
  pendingTextWrap: { flex: 1 },
  pendingTitleRow: { marginBottom: 8 },
  pendingTitleBar: {
    width: "62%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  pendingSubBar: {
    width: "42%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.14)"
  }
});
