import { alpha, type Theme } from "@mui/material/styles";

export const DASHBOARD_CHART_HEIGHT = 340;

/** Pinned loader version — "current" has caused `reading 'Do'` draw failures on line charts. */
export const DASHBOARD_CHART_VERSION = "51";

function chartFont(theme: Theme): string {
  const ff = theme.typography.fontFamily;
  return typeof ff === "string" ? ff : ff.join(",");
}

function chartTokens(theme: Theme) {
  const isDark = theme.palette.mode === "dark";
  return {
    fontName: chartFont(theme),
    textColor: theme.palette.text.secondary,
    gridColor: alpha(theme.palette.text.primary, isDark ? 0.1 : 0.07),
    axisColor: alpha(theme.palette.text.primary, isDark ? 0.16 : 0.1)
  };
}

/** High-contrast categorical colors (not theme primary/secondary — those are often grey on dark UI). */
const CHART_PALETTE_DARK = [
  "#5B8DEF",
  "#34D399",
  "#FB923C",
  "#F472B6",
  "#A78BFA",
  "#22D3EE",
  "#FACC15",
  "#F87171",
  "#818CF8",
  "#4ADE80"
];

const CHART_PALETTE_LIGHT = [
  "#2563EB",
  "#059669",
  "#EA580C",
  "#DB2777",
  "#7C3AED",
  "#0891B2",
  "#CA8A04",
  "#DC2626",
  "#4F46E5",
  "#16A34A"
];

/** Stable colors for common fund names so line and donut charts always match. */
const KNOWN_FUND_COLORS: Record<string, string> = {
  tithe: "#5B8DEF",
  seed: "#34D399",
  offering: "#FB923C",
  general: "#A78BFA",
  missions: "#22D3EE",
  building: "#F472B6",
  benevolence: "#FACC15",
  youth: "#818CF8",
  children: "#4ADE80",
  worship: "#F472B6"
};

function fundColorKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDashboardChartColors(theme: Theme): string[] {
  return theme.palette.mode === "dark" ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}

/** One distinct color per fund label; same label always maps to the same color. */
export function getColorsForFundLabels(theme: Theme, labels: string[]): string[] {
  const palette = getDashboardChartColors(theme);
  const used = new Set<string>();
  return labels.map((label, index) => {
    const known = KNOWN_FUND_COLORS[fundColorKey(label)];
    if (known) {
      used.add(known);
      return known;
    }
    const fallback = palette.find((c) => !used.has(c)) ?? palette[index % palette.length];
    used.add(fallback);
    return fallback;
  });
}

export type LineChartVariant = "multi" | "single";

export function getLineChartOptions(theme: Theme, height = DASHBOARD_CHART_HEIGHT, variant: LineChartVariant = "multi") {
  const t = chartTokens(theme);
  const colors = getDashboardChartColors(theme);

  const options: Record<string, unknown> = {
    height,
    backgroundColor: "transparent",
    colors,
    curveType: "function",
    legend: {
      position: variant === "single" ? "none" : "bottom",
      alignment: "center",
      maxLines: 4,
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 12 }
    },
    chartArea: {
      left: 48,
      right: 24,
      top: 24,
      bottom: variant === "single" ? 56 : 72,
      width: "90%",
      height: variant === "single" ? "75%" : "70%"
    },
    hAxis: {
      slantedText: false,
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 11 },
      gridlines: { color: t.gridColor },
      baselineColor: t.axisColor
    },
    vAxis: {
      minValue: 0,
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 11 },
      gridlines: { color: t.gridColor },
      baselineColor: t.axisColor
    },
    tooltip: {
      textStyle: { color: theme.palette.text.primary, fontName: t.fontName, fontSize: 13 },
      showColorCode: true
    }
  };

  if (variant === "single") {
    options.lineWidth = 3;
    options.pointSize = 6;
    options.series = {
      0: { areaOpacity: 0.15, lineWidth: 3, pointSize: 6, color: colors[0] }
    };
  }

  return options;
}

export function getPieChartOptions(theme: Theme, height = DASHBOARD_CHART_HEIGHT) {
  const t = chartTokens(theme);
  const colors = getDashboardChartColors(theme);

  return {
    height,
    backgroundColor: "transparent",
    colors,
    pieHole: 0.55,
    pieSliceText: "percentage",
    pieSliceBorderColor: "transparent",
    sliceVisibilityThreshold: 0.02,
    legend: {
      position: "bottom",
      alignment: "center",
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 12 }
    },
    chartArea: { left: 12, right: 12, top: 16, bottom: 48, width: "96%", height: "82%" },
    tooltip: {
      textStyle: { color: theme.palette.text.primary, fontName: t.fontName, fontSize: 13 },
      showColorCode: true
    }
  };
}

/** Options for horizontal bar charts (Google Charts `BarChart`). */
export function getBarChartOptions(theme: Theme, height = DASHBOARD_CHART_HEIGHT, colors?: string[]) {
  const t = chartTokens(theme);
  const base = getLineChartOptions(theme, height, "single");

  return {
    ...base,
    colors: colors?.length ? colors : getDashboardChartColors(theme),
    legend: { position: "none" },
    bar: { groupWidth: "65%" },
    chartArea: {
      left: 72,
      right: 24,
      top: 16,
      bottom: 40,
      width: "88%",
      height: "78%"
    },
    hAxis: {
      minValue: 0,
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 11 },
      gridlines: { color: t.gridColor },
      baselineColor: t.axisColor
    },
    vAxis: {
      textStyle: { color: t.textColor, fontName: t.fontName, fontSize: 11 },
      gridlines: { color: "transparent" },
      baselineColor: t.axisColor
    },
    series: {},
    lineWidth: undefined,
    pointSize: undefined
  };
}

/** @deprecated Use getLineChartOptions */
export function getBaseChartOptions(theme: Theme, height = DASHBOARD_CHART_HEIGHT) {
  return getLineChartOptions(theme, height, "multi");
}
