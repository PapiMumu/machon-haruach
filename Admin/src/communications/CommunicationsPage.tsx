import React, { memo } from "react";
import { Box, Typography } from "@mui/material";
import { Locale, PageHeader, Permissions, UserHelper } from "@machonharuach/apphelper";
import { useLocation } from "react-router-dom";
import { SendSmsPanel, SmsHistoryPanel } from "./components";

export const CommunicationsPage = memo(() => {
  const location = useLocation();
  const isHistory = location.pathname.includes("/history");

  const canSend = UserHelper.checkAccess(Permissions.messagingApi.texting.send);
  const canViewContent = UserHelper.checkAccess(Permissions.contentApi.content.edit);

  if (!canSend && !canViewContent) return <></>;

  return (
    <>
      <PageHeader
        title={Locale.label("communications.title")}
        subtitle={Locale.label("communications.subtitle", "Send SMS messages to your congregation")}
      />
      <Box sx={{ p: 3 }}>
        {isHistory ? (
          <SmsHistoryPanel />
        ) : canSend ? (
          <SendSmsPanel />
        ) : (
          <Typography color="text.secondary">{Locale.label("communications.send.noPermission")}</Typography>
        )}
      </Box>
    </>
  );
});
