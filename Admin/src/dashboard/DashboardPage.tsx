import React, { useMemo, useState } from "react";
import { Box, Container, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Locale, PageHeader, Permissions, UserHelper } from "@machonharuach/apphelper";
import {
  DashboardAttendanceByGenderCard,
  DashboardAttendanceSection,
  DashboardGivingByFundCard,
  DashboardGivingKpiRow,
  DashboardGivingSection,
  DashboardPeopleKpiRow
} from "./components";
import {
  dashboardChartCellSx,
  dashboardChartInnerSx,
  dashboardFullWidthCellSx,
  dashboardKpiCellSx,
  dashboardMainGridSx
} from "./helpers/dashboardLayout";
import { periodToDates, periodLabel, type DashboardPeriod } from "./helpers/dateRange";

export const DashboardPage = () => {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const { startDate, endDate } = useMemo(() => periodToDates(period), [period]);

  const canGiving = UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary);
  const canAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);
  const canPeople = UserHelper.checkAccess(Permissions.membershipApi.people.view);
  const showPeopleRow = canAttendance || canPeople;

  return (
    <>
      <PageHeader
        title={Locale.label("components.wrapper.dash", "Dashboard")}
        subtitle={Locale.label(
          "dashboard.dashboardPage.subtitle",
          "Welcome to your church management dashboard. View giving, attendance, and key activity at a glance."
        )}
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("dashboard.period.label", "Reporting period")}: {periodLabel(period)}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={period}
                onChange={(_, v) => v && setPeriod(v)}
                aria-label="Dashboard date range">
                <ToggleButton value="7d">{Locale.label("dashboard.period.7d", "7 days")}</ToggleButton>
                <ToggleButton value="30d">{Locale.label("dashboard.period.30d", "30 days")}</ToggleButton>
                <ToggleButton value="90d">{Locale.label("dashboard.period.90d", "90 days")}</ToggleButton>
                <ToggleButton value="ytd">{Locale.label("dashboard.period.ytd", "YTD")}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={dashboardMainGridSx}>
              {canGiving ? (
                <Box sx={dashboardKpiCellSx}>
                  <DashboardGivingKpiRow startDate={startDate} endDate={endDate} period={period} />
                </Box>
              ) : null}
              {canGiving ? (
                <Box sx={dashboardChartCellSx}>
                  <Box sx={dashboardChartInnerSx}>
                    <DashboardGivingByFundCard startDate={startDate} endDate={endDate} />
                  </Box>
                </Box>
              ) : null}
              {canGiving ? (
                <Box sx={dashboardFullWidthCellSx}>
                  <DashboardGivingSection startDate={startDate} endDate={endDate} period={period} />
                </Box>
              ) : null}
              {showPeopleRow ? (
                <Box
                  sx={{
                    ...dashboardKpiCellSx,
                    gridColumn: canAttendance ? dashboardKpiCellSx.gridColumn : { xs: "1 / -1", lg: "span 12" }
                  }}>
                  <DashboardPeopleKpiRow startDate={startDate} endDate={endDate} period={period} />
                </Box>
              ) : null}
              {canAttendance ? (
                <Box sx={dashboardChartCellSx}>
                  <Box sx={dashboardChartInnerSx}>
                    <DashboardAttendanceSection startDate={startDate} endDate={endDate} period={period} />
                  </Box>
                </Box>
              ) : null}
              {canAttendance ? (
                <Box sx={dashboardFullWidthCellSx}>
                  <DashboardAttendanceByGenderCard startDate={startDate} endDate={endDate} period={period} />
                </Box>
              ) : null}
            </Box>
          </Stack>
        </Box>
      </Container>
    </>
  );
};
