import React, { useMemo } from "react";
import { Button, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Locale } from "@machonharuach/apphelper";
import { Link } from "react-router-dom";
import { DashboardChart } from "./DashboardChart";
import { DashboardChartCard } from "./DashboardChartCard";
import {
  buildAttendanceGenderBarData,
  fetchAttendanceByGender,
  genderChartLabel
} from "../helpers/attendanceByGender";
import { getBarChartOptions } from "../helpers/chartOptions";
import { periodLabel, type DashboardPeriod } from "../helpers/dateRange";

interface Props {
  startDate: string;
  endDate: string;
  period: DashboardPeriod;
}

export function DashboardAttendanceByGenderCard({ startDate, endDate, period }: Props) {
  const theme = useTheme();

  const genderQuery = useQuery({
    queryKey: ["dashboard-attendance-by-gender", startDate, endDate],
    queryFn: () => fetchAttendanceByGender(startDate, endDate)
  });

  const genderLabels = useMemo(
    () => ({
      male: Locale.label("person.male", "Male"),
      female: Locale.label("person.female", "Female"),
      unspecified: Locale.label("person.unspecified", "Unspecified")
    }),
    []
  );

  const genderBar = useMemo(
    () =>
      buildAttendanceGenderBarData(genderQuery.data || [], (gender) =>
        genderChartLabel(gender, genderLabels)
      ),
    [genderQuery.data, genderLabels]
  );

  const periodText = periodLabel(period);
  const viewAttendance = (
    <Button component={Link} to="/attendance" size="small" variant="text">
      {Locale.label("dashboard.charts.viewAttendance", "View attendance")}
    </Button>
  );

  return (
    <DashboardChartCard
      title={Locale.label("dashboard.charts.attendanceByGender", "Attendance by gender")}
      subtitle={periodText}
      isLoading={genderQuery.isLoading}
      isEmpty={!genderQuery.isLoading && genderBar.chartData.length <= 1}
      action={viewAttendance}>
      {genderBar.chartData.length > 1 ? (
        <DashboardChart
          chartType="BarChart"
          data={genderBar.chartData}
          options={getBarChartOptions(theme, undefined, genderBar.colors)}
        />
      ) : null}
    </DashboardChartCard>
  );
}
