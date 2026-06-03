import React, { useMemo } from "react";
import { Button, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Locale } from "@machonharuach/apphelper";
import { Link } from "react-router-dom";
import { DashboardChart } from "./DashboardChart";
import { DashboardChartCard } from "./DashboardChartCard";
import { fetchAttendanceTrend, filterAttendanceTrendByRange } from "../helpers/attendanceTrend";
import { getLineChartOptions } from "../helpers/chartOptions";
import { periodLabel, type DashboardPeriod } from "../helpers/dateRange";

interface Props {
  startDate: string;
  endDate: string;
  period: DashboardPeriod;
}

export function DashboardAttendanceSection({ startDate, endDate, period }: Props) {
  const theme = useTheme();

  const trendQuery = useQuery({
    queryKey: ["dashboard-attendance-trend", startDate, endDate],
    queryFn: fetchAttendanceTrend
  });

  const rowsInPeriod = useMemo(
    () => filterAttendanceTrendByRange(trendQuery.data || [], startDate, endDate),
    [trendQuery.data, startDate, endDate]
  );

  const lineData = useMemo(() => {
    const rows = rowsInPeriod;
    if (!rows.length) return [];
    return [
      ["Week", "Visits"],
      ...rows.map((r) => {
        const raw = r.week;
        const d = raw ? new Date(raw) : null;
        const label =
          d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : String(raw || "");
        return [label, Number(r.visits || 0)];
      })
    ];
  }, [rowsInPeriod]);

  const latestVisits = useMemo(() => {
    if (!rowsInPeriod.length) return 0;
    return Number(rowsInPeriod[rowsInPeriod.length - 1]?.visits || 0);
  }, [rowsInPeriod]);

  const periodText = periodLabel(period);

  return (
    <DashboardChartCard
      title={Locale.label("dashboard.charts.attendanceTrend", "Attendance trend")}
      subtitle={`${periodText} · ${Locale.label("dashboard.charts.latestWeek", "Latest week")}: ${latestVisits}`}
      isLoading={trendQuery.isLoading}
      isEmpty={!trendQuery.isLoading && lineData.length <= 1}
      action={
        <Button component={Link} to="/attendance" size="small" variant="text">
          {Locale.label("dashboard.charts.viewAttendance", "View attendance")}
        </Button>
      }>
      {lineData.length > 1 ? (
        <DashboardChart
          chartType="LineChart"
          data={lineData}
          options={getLineChartOptions(theme, undefined, "single")}
        />
      ) : null}
    </DashboardChartCard>
  );
}
