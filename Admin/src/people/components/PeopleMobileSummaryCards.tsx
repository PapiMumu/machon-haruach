import React from "react";
import { Grid } from "@mui/material";
import { Locale } from "@machonharuach/apphelper";
import { DashboardStatCard } from "../../dashboard/components/DashboardStatCard";
import { People as PeopleIcon, CheckCircle as ActiveIcon, HighlightOff as InactiveIcon } from "@mui/icons-material";

interface Props {
  registered: number;
  active: number;
  inactive: number;
}

export function PeopleMobileSummaryCards(props: Props) {
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <DashboardStatCard
          compact
          label={Locale.label("people.peoplePage.summaryRegistered", "Registered members")}
          value={String(props.registered)}
          hint={Locale.label("people.peoplePage.summaryRegisteredHint", "Mobile registrations")}
          icon={<PeopleIcon fontSize="small" />}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <DashboardStatCard
          compact
          label={Locale.label("people.peoplePage.summaryActive", "Active subscriptions")}
          value={String(props.active)}
          hint={Locale.label("people.peoplePage.summaryActiveHint", "Active or trialing")}
          icon={<ActiveIcon fontSize="small" sx={{ color: "#4caf50" }} />}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <DashboardStatCard
          compact
          label={Locale.label("people.peoplePage.summaryInactive", "Inactive subscriptions")}
          value={String(props.inactive)}
          hint={Locale.label("people.peoplePage.summaryInactiveHint", "Subscription inactive")}
          icon={<InactiveIcon fontSize="small" sx={{ color: "#ef5350" }} />}
        />
      </Grid>
    </Grid>
  );
}
