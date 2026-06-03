import { useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

type HeaderConfig = {
  title?: string;
  placeholder?: string;
  headerRight?: () => ReactNode;
  headerLeft?: () => ReactNode;
  dependencies?: any[]; // additional dependencies
};

export function useScreenHeader({ title, placeholder, headerRight, headerLeft, dependencies = [] }: HeaderConfig) {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const opts: Parameters<typeof navigation.setOptions>[0] = {
        title: title || placeholder || "Screen"
      };
      if (headerRight !== undefined) opts.headerRight = headerRight;
      if (headerLeft !== undefined) opts.headerLeft = headerLeft;
      navigation.setOptions(opts);
    }, [navigation, title, placeholder, headerRight, headerLeft, ...dependencies])
  );
}
