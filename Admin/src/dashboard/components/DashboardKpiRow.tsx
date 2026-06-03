import React, { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  VolunteerActivism as GivingIcon,
  Groups as PeopleIcon,
  EventAvailable as AttendanceIcon,
  LocationOn as BranchIcon
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, CurrencyHelper, Locale, Permissions, UserHelper } from "@machonharuach/apphelper";
import {
  DashboardStatCard,
  KpiCardDetailPanel,
  KpiCardFooter,
  KpiCardMetaRow
} from "./DashboardStatCard";
import { fetchAttendanceTrend, filterAttendanceTrendByRange } from "../helpers/attendanceTrend";
import { fetchCampusNames, fetchFundTotalsForRange, getTopBranchWithGiving } from "../helpers/givingFundTotals";
import { periodLabel, type DashboardPeriod } from "../helpers/dateRange";

interface RowProps {
  startDate: string;
  endDate: string;
  period: DashboardPeriod;
}

/** Total giving + top branch KPIs (first dashboard row). */
export function DashboardGivingKpiRow({ startDate, endDate, period }: RowProps) {
  const canGiving = UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary);

  const givingQuery = useQuery({
    queryKey: ["dashboard-kpi-giving", startDate, endDate],
    queryFn: () => fetchFundTotalsForRange(startDate, endDate),
    enabled: canGiving
  });

  const campusesQuery = useQuery({
    queryKey: ["dashboard-campuses"],
    queryFn: fetchCampusNames,
    enabled: canGiving
  });

  const totalGiving = useMemo(() => {
    if (!givingQuery.data) return 0;
    return givingQuery.data.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  }, [givingQuery.data]);

  const topBranchGiving = useMemo(
    () => getTopBranchWithGiving(givingQuery.data || [], campusesQuery.data || []),
    [givingQuery.data, campusesQuery.data]
  );

  const fundCount = useMemo(() => {
    const names = new Set<string>();
    (givingQuery.data || []).forEach((r) => {
      const n = String(r.fundName || "").trim();
      if (n) names.add(n);
    });
    return names.size;
  }, [givingQuery.data]);

  const periodCaption = periodLabel(period);
  const givingLoading = givingQuery.isLoading;
  const branchLoading = givingQuery.isLoading || campusesQuery.isLoading;

  if (!canGiving) return null;

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
        <DashboardStatCard
          compact
          label={Locale.label("dashboard.kpi.totalGiving", "Total giving")}
          value={givingLoading ? "…" : CurrencyHelper.formatCurrency(totalGiving)}
          icon={<GivingIcon />}
          footer={
            givingLoading ? undefined : (
              <KpiCardFooter compact>
                <KpiCardMetaRow
                  leading={Locale.label("dashboard.kpi.totalGivingScope", "All branches & funds")}
                  period={periodCaption}
                />
                {fundCount > 0 ? (
                  <KpiCardDetailPanel compact title={Locale.label("dashboard.kpi.totalGivingFunds", "Funds with activity")}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {fundCount}
                    </Typography>
                  </KpiCardDetailPanel>
                ) : null}
              </KpiCardFooter>
            )
          }
        />
        <DashboardStatCard
          compact
          label={Locale.label("dashboard.kpi.topBranchGiving", "Top giving branch")}
          value={
            branchLoading
              ? "…"
              : topBranchGiving
                ? topBranchGiving.branch
                : Locale.label("dashboard.kpi.topBranchGivingNone", "—")
          }
          icon={<BranchIcon />}
          footer={
            branchLoading || !topBranchGiving ? undefined : (
              <KpiCardFooter compact>
                <KpiCardMetaRow
                  leading={CurrencyHelper.formatCurrency(topBranchGiving.total)}
                  period={periodCaption}
                  leadingEmphasis
                />
                {topBranchGiving.topFundLabel ? (
                  <KpiCardDetailPanel compact title={Locale.label("dashboard.kpi.topBranchTopFund", "Top fund")}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }} noWrap>
                        {topBranchGiving.topFundLabel}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main", flexShrink: 0 }}>
                        {CurrencyHelper.formatCurrency(topBranchGiving.topFundAmount)}
                      </Typography>
                    </Box>
                  </KpiCardDetailPanel>
                ) : null}
              </KpiCardFooter>
            )
          }
        />
    </Stack>
  );
}

/** Attendance + recent people KPIs (beside attendance trend). */
export function DashboardPeopleKpiRow({ startDate, endDate, period }: RowProps) {
  const canPeople = UserHelper.checkAccess(Permissions.membershipApi.people.view);
  const canAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);

  const peopleQuery = useQuery({
    queryKey: ["/people/recent", "MembershipApi", "dashboard-kpi"],
    queryFn: () => ApiHelper.get("/people/recent", "MembershipApi") as Promise<unknown[]>,
    enabled: canPeople
  });

  const attendanceQuery = useQuery({
    queryKey: ["dashboard-attendance-trend", startDate, endDate],
    queryFn: fetchAttendanceTrend,
    enabled: canAttendance
  });

  const recentPeople = peopleQuery.data?.length ?? 0;
  const latestAttendance = useMemo(() => {
    const rows = filterAttendanceTrendByRange(attendanceQuery.data || [], startDate, endDate);
    if (!rows.length) return 0;
    return Number(rows[rows.length - 1]?.visits || 0);
  }, [attendanceQuery.data, startDate, endDate]);

  const periodCaption = periodLabel(period);

  if (!canAttendance && !canPeople) return null;

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      {canAttendance ? (
        <DashboardStatCard
          label={Locale.label("dashboard.kpi.attendance", "Attendance (latest week)")}
          value={attendanceQuery.isLoading ? "…" : String(latestAttendance)}
          icon={<AttendanceIcon />}
          footer={
            attendanceQuery.isLoading ? undefined : (
              <KpiCardFooter>
                <KpiCardMetaRow
                  leading={Locale.label("dashboard.kpi.attendanceLatest", "Visits in latest week")}
                  period={periodCaption}
                />
                <KpiCardDetailPanel title={Locale.label("dashboard.kpi.attendanceScope", "In selected period")}>
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("dashboard.kpi.attendancePanelHint", "Based on weekly attendance trend")}
                  </Typography>
                </KpiCardDetailPanel>
              </KpiCardFooter>
            )
          }
        />
      ) : null}
      {canPeople ? (
        <DashboardStatCard
          label={Locale.label("dashboard.kpi.recentPeople", "Recent people")}
          value={peopleQuery.isLoading ? "…" : String(recentPeople)}
          icon={<PeopleIcon />}
          footer={
            peopleQuery.isLoading ? undefined : (
              <KpiCardFooter>
                <KpiCardMetaRow
                  leading={Locale.label("dashboard.kpi.recentPeopleScope", "Active in directory")}
                  period={periodCaption}
                />
                <KpiCardDetailPanel title={Locale.label("dashboard.kpi.recentPeopleDetail", "Activity")}>
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("dashboard.kpi.recentPeopleHint", "Recently active in directory")}
                  </Typography>
                </KpiCardDetailPanel>
              </KpiCardFooter>
            )
          }
        />
      ) : null}
    </Stack>
  );
}

/** @deprecated Use DashboardGivingKpiRow and DashboardPeopleKpiRow */
export function DashboardKpiRow(props: RowProps) {
  return (
    <>
      <DashboardGivingKpiRow {...props} />
      <DashboardPeopleKpiRow {...props} />
    </>
  );
}
