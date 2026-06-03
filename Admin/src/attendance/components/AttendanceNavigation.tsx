import { CalendarMonth as CalendarIcon, Group as GroupIcon, Settings as SettingsIcon, Tablet as TabletIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { UserHelper, Permissions, Locale } from "@machonharuach/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const AttendanceNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange } = props;

  const tabs = useMemo(() => {
    const tabsList: { value: string; title: string; subtitle: string; icon: React.ReactNode }[] = [];
    tabsList.push({
      value: "setup",
      title: "Structure",
      subtitle: "Branches, services, and events",
      icon: <SettingsIcon />
    });
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({
        value: "attendance",
        title: Locale.label("attendance.tabs.attTrend"),
        subtitle: "Attendance trend insights",
        icon: <CalendarIcon />
      });
    }
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({
        value: "groups",
        title: Locale.label("attendance.tabs.groupAtt"),
        subtitle: "Group attendance reports",
        icon: <GroupIcon />
      });
    }
    tabsList.push({
      value: "kiosk",
      title: "Kiosk Theme",
      subtitle: "Check-in display settings",
      icon: <TabletIcon />
    });
    return tabsList;
  }, []);

  return (
    <Box sx={{ px: 3, pt: 1 }}>
      <Box
        sx={{
          mb: 2.5,
          p: 0.75,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_event, value: string) => onTabChange(value)}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            minHeight: 0,
            "& .MuiTabs-flexContainer": { gap: 1 }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              disableRipple
              icon={tab.icon}
              iconPosition="start"
              label={(
                <Box sx={{ textAlign: "left" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>{tab.title}</Typography>
                  <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>{tab.subtitle}</Typography>
                </Box>
              )}
              sx={{
                minHeight: 0,
                alignItems: "flex-start",
                textTransform: "none",
                borderRadius: 2,
                px: 2,
                py: 1.2,
                color: "rgba(255,255,255,0.8)",
                border: "1px solid transparent",
                transition: "all .16s ease",
                "& .MuiSvgIcon-root": { opacity: 0.9 },
                "&.Mui-selected": {
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.2)"
                }
              }}
            />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
});
