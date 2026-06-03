import React, { useState, useCallback } from "react";
import { Box, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { UserHelper, Permissions, PageHeader, Locale } from "@machonharuach/apphelper";
import { Navigate } from "react-router-dom";
import type { LinkInterface } from "@machonharuach/helpers";
import { NavigationTabs } from "../components/ui";
import { DashboardCardEdit, DashboardCards, GoodNewsDailyItems, GoodNewsDailyItemEdit } from "./components";

export const MobileAppSettingsPage = () => {
  const [selectedMode, setSelectedMode] = useState<"cards" | "goodnews">("cards");
  const [selectedItem, setSelectedItem] = useState<LinkInterface>(null);
  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);
  const [goodNewsRefreshKey, setGoodNewsRefreshKey] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) setRedirectUrl("/");
  }, []);

  const handleAddDashboardCard = () => {
    const newCard: LinkInterface = {
      churchId: UserHelper.currentUserChurch.church.id,
      sort: 0,
      text: "",
      url: "",
      icon: "carousel",
      linkData: "",
      linkType: "url",
      category: "b1DashboardCard"
    };
    (newCard as any).visibility = "everyone";
    setSelectedItem(newCard);
  };

  const handleAddGoodNewsItem = () => {
    const newItem: LinkInterface = {
      churchId: UserHelper.currentUserChurch.church.id,
      sort: 0,
      text: "",
      url: "",
      icon: "article",
      linkData: "",
      linkType: "url",
      category: "b1GoodNewsDaily"
    };
    (newItem as any).visibility = "everyone";
    setSelectedItem(newItem);
  };

  const handleCardsUpdated = () => {
    setSelectedItem(null);
    setCardsRefreshKey(Math.random());
  };

  const handleGoodNewsUpdated = () => {
    setSelectedItem(null);
    setGoodNewsRefreshKey(Math.random());
  };

  React.useEffect(checkAccess, [checkAccess]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

  return (
    <>
      <PageHeader
        title={Locale.label("settings.mobileAppSettings.title")}
        subtitle={Locale.label("settings.mobileAppSettings.subtitle")}
      >
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={selectedMode === "cards" ? handleAddDashboardCard : handleAddGoodNewsItem}
          sx={{
            color: "#FFF",
            borderColor: "rgba(255,255,255,0.5)",
            "&:hover": {
              borderColor: "#FFF",
              backgroundColor: "rgba(255,255,255,0.1)"
            }
          }}
        >
          {selectedMode === "cards" ? "Add Dashboard Card" : "Add GoodNews Item"}
        </Button>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <NavigationTabs
          appearance="panel"
          embedded
          selectedTab={selectedMode}
          onTabChange={(value) => {
            setSelectedMode(value as "cards" | "goodnews");
            setSelectedItem(null);
          }}
          tabs={[
            { value: "cards", label: "Dashboard Cards", subtitle: "Home screen content" },
            { value: "goodnews", label: "GoodNews Daily Content", subtitle: "Native page blocks" }
          ]}
        />

        {selectedMode === "cards" && selectedItem && (
          <Box id="mobile-dashboard-card-edit-panel" sx={{ mb: 3 }}>
            <DashboardCardEdit currentCard={selectedItem} updatedFunction={handleCardsUpdated} />
          </Box>
        )}

        {selectedMode === "goodnews" && selectedItem && (
          <Box id="mobile-goodnews-edit-panel" sx={{ mb: 3 }}>
            <GoodNewsDailyItemEdit currentItem={selectedItem} updatedFunction={handleGoodNewsUpdated} />
          </Box>
        )}

        {UserHelper.currentUserChurch && UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <>
            {selectedMode === "cards" && (
              <div id="mobile-dashboard-cards-list">
                <DashboardCards onSelected={(card: LinkInterface) => setSelectedItem(card)} refreshKey={cardsRefreshKey} />
              </div>
            )}
            {selectedMode === "goodnews" && (
              <div id="mobile-goodnews-list">
                <GoodNewsDailyItems
                  onSelected={(item: LinkInterface) => setSelectedItem(item)}
                  refreshKey={goodNewsRefreshKey}
                  onAdd={handleAddGoodNewsItem}
                />
              </div>
            )}
          </>
        )}
      </Box>
    </>
  );
};
