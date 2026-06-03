import { type GroupInterface } from "@machonharuach/helpers";
import { CalendarMonth as AttendanceIcon, Dashboard as OverviewIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Locale } from "@machonharuach/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  group: GroupInterface;
}

export const GroupNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, group } = props;

  const isStandard = useMemo(() => group?.tags?.indexOf("standard") > -1, [group?.tags]);
  const hasSessionsTab = isStandard && group?.trackAttendance;

  // Avoid rendering a separate "Members" strip when there is only one tab.
  if (!hasSessionsTab) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
      <ToggleButtonGroup
        exclusive
        value={selectedTab}
        onChange={(_event, newValue) => {
          if (newValue) onTabChange(newValue);
        }}
        size="small"
        sx={{
          "& .MuiToggleButton-root": {
            textTransform: "none",
            fontWeight: 500,
            px: 1.5,
            borderColor: "divider",
            color: "text.secondary",
            "&.Mui-selected": {
              color: "text.primary",
              backgroundColor: "rgba(255,255,255,0.12)"
            }
          }
        }}
      >
        <ToggleButton value="members">
          <OverviewIcon sx={{ fontSize: 16, mr: 0.6 }} />
          Overview
        </ToggleButton>
        <ToggleButton value="sessions">
          <AttendanceIcon sx={{ fontSize: 16, mr: 0.6 }} />
          {Locale.label("groups.groupNavigation.sessions")}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
});
