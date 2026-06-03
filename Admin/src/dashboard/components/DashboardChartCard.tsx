import { Card, CardContent, Typography, Box } from "@mui/material";
import { Loading, Locale } from "@machonharuach/apphelper";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
  action?: ReactNode;
}

export function DashboardChartCard({ title, subtitle, isLoading, isEmpty, children, action }: Props) {
  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)", width: "100%", height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Box>
        {isLoading ? (
          <Box sx={{ py: 6 }}>
            <Loading size="sm" />
          </Box>
        ) : isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {Locale.label("dashboard.charts.noData", "No data for this period.")}
          </Typography>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
