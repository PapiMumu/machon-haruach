import React, { memo, useMemo } from "react";
import { UserHelper, Permissions, PageHeader, Locale } from "@machonharuach/apphelper";
import { Box } from "@mui/material";
import { ObsStreamSetup, Services } from "./components";
import { NavigationTabs } from "../components/ui/NavigationTabs";

export const LiveStreamTimesPage = memo(() => {
  const [selectedTab, setSelectedTab] = React.useState("services");

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const tabs = useMemo(
    () => [
      {
        value: "services",
        label: Locale.label("sermons.liveStreamTimes.services"),
        subtitle: Locale.label("sermons.liveStreamTimes.servicesTabSubtitle", "Service times and YouTube live video for Machon HaRuach Mobile")
      },
      {
        value: "settings",
        label: Locale.label("sermons.liveStreamTimes.settings"),
        subtitle: Locale.label("sermons.liveStreamTimes.settingsTabSubtitle", "OBS streaming reference")
      }
    ],
    []
  );

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "services": return <Services />;
      case "settings": return <ObsStreamSetup />;
      default: return <Services />;
    }
  };

  return (
    <>
      <PageHeader title={Locale.label("sermons.liveStreamTimes.title")} subtitle={Locale.label("sermons.liveStreamTimes.subtitle")} />
      <Box sx={{ p: 3 }}>
        <NavigationTabs
          appearance="panel"
          embedded
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          tabs={tabs}
        />
        {getCurrentTab()}
      </Box>
    </>
  );
});
