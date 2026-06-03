export type DashboardPeriod = "7d" | "30d" | "90d" | "ytd";

export function periodToDates(period: DashboardPeriod): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (period === "7d") start.setDate(end.getDate() - 7);
  else if (period === "30d") start.setDate(end.getDate() - 30);
  else if (period === "90d") start.setDate(end.getDate() - 90);
  else start.setMonth(0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function periodLabel(period: DashboardPeriod): string {
  switch (period) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "ytd": return "Year to date";
  }
}
