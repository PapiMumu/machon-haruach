/** Shared dashboard grid: KPI column (4/12) and chart column (8/12) stay aligned across rows. */
export const DASHBOARD_KPI_COLUMN = { xs: 12, lg: 4 } as const;
export const DASHBOARD_CHART_COLUMN = { xs: 12, lg: 8 } as const;

export const dashboardChartColumnSx = {
  display: "flex",
  minWidth: 0
} as const;

export const dashboardChartInnerSx = {
  flex: 1,
  minWidth: 0,
  width: "100%"
} as const;

/** 12-column page grid so giving/attendance rows share identical column tracks. */
export const dashboardMainGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
  gap: 2,
  alignItems: "start"
} as const;

export const dashboardKpiCellSx = {
  gridColumn: { xs: "1 / -1", lg: "span 4" },
  minWidth: 0,
  width: "100%"
} as const;

export const dashboardChartCellSx = {
  gridColumn: { xs: "1 / -1", lg: "span 8" },
  minWidth: 0,
  width: "100%",
  ...dashboardChartColumnSx
} as const;

export const dashboardFullWidthCellSx = {
  gridColumn: "1 / -1",
  minWidth: 0,
  width: "100%"
} as const;
