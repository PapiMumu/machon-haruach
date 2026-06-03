import React, { useMemo } from "react";
import { Button, useTheme } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { CurrencyHelper, Locale } from "@machonharuach/apphelper";
import { Link } from "react-router-dom";
import { aggregateGivingByFund, fetchFundTotalsForRange } from "../helpers/givingFundTotals";
import { DashboardChart } from "./DashboardChart";
import { DashboardChartCard } from "./DashboardChartCard";
import { getColorsForFundLabels, getPieChartOptions } from "../helpers/chartOptions";

interface Props {
  startDate: string;
  endDate: string;
}

function toPieData(rows: { label: string; value: number }[]): (string | number)[][] {
  if (!rows.length) return [];
  return [["Label", "Amount"], ...rows.map((r) => [r.label, r.value])];
}

export function DashboardGivingByFundCard({ startDate, endDate }: Props) {
  const theme = useTheme();

  const fundTotalsQuery = useQuery({
    queryKey: ["dashboard-fundTotals", startDate, endDate],
    queryFn: () => fetchFundTotalsForRange(startDate, endDate)
  });

  const byFund = useMemo(
    () => aggregateGivingByFund(fundTotalsQuery.data || []),
    [fundTotalsQuery.data]
  );

  const totalGiving = useMemo(() => byFund.reduce((s, r) => s + r.value, 0), [byFund]);

  const pieChartColors = useMemo(
    () => getColorsForFundLabels(theme, byFund.map((f) => f.label)),
    [byFund, theme]
  );

  const viewGiving = (
    <Button component={Link} to="/donations" size="small" variant="text">
      {Locale.label("dashboard.charts.viewGiving", "View giving")}
    </Button>
  );

  return (
    <DashboardChartCard
      title={Locale.label("dashboard.charts.givingByFund", "Giving by fund")}
      subtitle={CurrencyHelper.formatCurrency(totalGiving)}
      isLoading={fundTotalsQuery.isLoading}
      isEmpty={!fundTotalsQuery.isLoading && byFund.length === 0}
      action={viewGiving}>
      {byFund.length > 0 ? (
        <DashboardChart
          chartType="PieChart"
          data={toPieData(byFund)}
          options={{ ...getPieChartOptions(theme), colors: pieChartColors }}
        />
      ) : null}
    </DashboardChartCard>
  );
}
