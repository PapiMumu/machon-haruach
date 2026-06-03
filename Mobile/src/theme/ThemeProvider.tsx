import React, { createContext, useContext, useCallback, useMemo } from "react";
import { PaperProvider } from "react-native-paper";
import { createAppTheme } from "./index";
import { useChurchStore } from "../stores/useChurchStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: ThemeType = "dark";
  const appTheme = useChurchStore(state => state.appTheme);

  /** App is dark-only; theme toggle was removed from the UI. Kept as a stable no-op for any legacy callers. */
  const toggleTheme = useCallback(async () => {}, []);

  React.useEffect(() => {
    void AsyncStorage.removeItem("theme").catch(() => {});
  }, []);

  // Build Paper theme dynamically based on mode + church colors
  const paperTheme = useMemo(
    () => createAppTheme(theme, appTheme?.[theme] || null),
    [theme, appTheme]
  );

  const value = { theme, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};
