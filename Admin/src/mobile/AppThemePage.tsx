import React from "react";
import { Box } from "@mui/material";
import { Locale, PageHeader } from "@machonharuach/apphelper";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";

export const AppThemePage: React.FC = () => (
  <>
    <PageHeader title={Locale.label("mobile.appThemePage.title")} subtitle={Locale.label("mobile.appThemePage.subtitle")} />
    <Box id="mobile-theme-settings-card" sx={{ p: 3 }}>
      <AppThemeEdit />
    </Box>
  </>
);
