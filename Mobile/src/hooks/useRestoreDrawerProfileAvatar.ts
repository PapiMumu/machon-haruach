import React, { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { HeaderProfileAvatar } from "@/components/navigation/HeaderProfileAvatar";
import { findDrawerNavigation } from "@/helpers/drawerNavigation";

/** Re-apply the profile avatar on the drawer header (clears stale overrides from other tabs/screens). */
export function restoreDrawerProfileAvatar(navigation: { getParent?: () => unknown }) {
  const drawerNav = findDrawerNavigation(navigation);
  drawerNav?.setOptions?.({
    headerRight: () => React.createElement(HeaderProfileAvatar),
    headerLeft: undefined
  });
}

/** Call on home/dashboard focus so the header avatar returns after visiting Giving, GoodNews Daily, etc. */
export function useRestoreDrawerProfileAvatar() {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      restoreDrawerProfileAvatar(navigation);
    }, [navigation])
  );
}
