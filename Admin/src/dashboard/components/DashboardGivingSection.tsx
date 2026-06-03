import React, { useMemo } from "react";
import { Button, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Locale } from "@machonharuach/apphelper";
import { Link } from "react-router-dom";
import { buildGivingLineChartByFund, fetchGivingSummaryWeeks } from "../helpers/givingFundTotals";
import { DashboardChart } from "./DashboardChart";
import { DashboardChartCard } from "./DashboardChartCard";
import { getColorsForFundLabels, getLineChartOptions } from "../helpers/chartOptions";
import { periodLabel, type DashboardPeriod } from "../helpers/dateRange";

interface Props {
  startDate: string;
  endDate: string;
  period: DashboardPeriod;
}

export function DashboardGivingSection({ startDate, endDate, period }: Props) {
  const theme = useTheme();

  const summaryWeeksQuery = useQuery({
    queryKey: ["dashboard-giving-summary-weeks", startDate, endDate],
    queryFn: () => fetchGivingSummaryWeeks(startDate, endDate)
  });

  const lineData = useMemo(
    () => buildGivingLineChartByFund(summaryWeeksQuery.data || []),
    [summaryWeeksQuery.data]
  );

  const lineChartColors = useMemo(() => {
    if (lineData.length <= 1) return undefined;
    const fundLabels = lineData[0].slice(1).map((l) => String(l));
    return getColorsForFundLabels(theme, fundLabels);
  }, [lineData, theme]);

  const periodText = periodLabel(period);
  const viewGiving = (
    <Button component={Link} to="/donations" size="small" variant="text">
      {Locale.label("dashboard.charts.viewGiving", "View giving")}
    </Button>
  );

  return (
    <DashboardChartCard
      title={Locale.label("dashboard.charts.givingOverTime", "Giving over time")}
      subtitle={periodText}
      isLoading={summaryWeeksQuery.isLoading}
      isEmpty={!summaryWeeksQuery.isLoading && lineData.length <= 1}
      action={viewGiving}>
      {lineData.length > 1 ? (
        <DashboardChart
          chartType="LineChart"
          data={lineData}
          options={{
            ...getLineChartOptions(theme, undefined, "multi"),
            ...(lineChartColors ? { colors: lineChartColors } : {})
          }}
        />
      ) : null}
    </DashboardChartCard>
  );
}
