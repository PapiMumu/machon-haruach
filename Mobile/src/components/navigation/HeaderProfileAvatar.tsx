import React from "react";
import { TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { Avatar } from "../common/Avatar";
import { useCurrentUserChurch, useUser } from "@/stores/useUserStore";
import { useThemeColors } from "@/theme";

const HEADER_AVATAR_INITIALS_PROPS = {
  backgroundColor: "#FFFFFF",
  textColor: "#0F1118",
  style: { borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" }
} as const;

/** Header profile control — shared so screens can restore it after temporary header overrides. */
export function HeaderProfileAvatar() {
  const user = useUser();
  const currentChurch = useCurrentUserChurch();
  const tc = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => (user ? router.push("/(drawer)/profileEdit") : router.push("/auth/login"))}
      style={{ marginRight: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Profile">
      {user ? (
        <Avatar
          size={30}
          photoUrl={currentChurch?.person?.photo}
          firstName={user.firstName}
          lastName={user.lastName}
          {...(!currentChurch?.person?.photo ? HEADER_AVATAR_INITIALS_PROPS : {})}
        />
      ) : (
        <MaterialIcons name="person-outline" size={26} color={tc.white} />
      )}
    </TouchableOpacity>
  );
}
