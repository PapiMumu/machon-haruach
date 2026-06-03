import { Box } from "@mui/material";
import { Chart } from "react-google-charts";
import { DASHBOARD_CHART_HEIGHT, DASHBOARD_CHART_VERSION } from "../helpers/chartOptions";

type ChartType = "LineChart" | "PieChart" | "ColumnChart" | "BarChart";

interface Props {
  chartType: ChartType;
  data: (string | number)[][];
  options: Record<string, unknown>;
  height?: number;
}

/** Renders dashboard charts with consistent spacing inside chart cards. */
export function DashboardChart({ chartType, data, options, height = DASHBOARD_CHART_HEIGHT }: Props) {
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& > div": { width: "100% !important" }
      }}>
      <Chart
        chartVersion={DASHBOARD_CHART_VERSION}
        chartType={chartType}
        data={data}
        width="100%"
        height={`${height}px`}
        options={options}
      />
    </Box>
  );
}
