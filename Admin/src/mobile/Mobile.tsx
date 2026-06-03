import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MobileAppSettingsPage } from "../settings/MobileAppSettingsPage";
import { AppThemePage } from "./AppThemePage";
import { MobilePage } from "./MobilePage";
import { CheckInPage } from "./CheckInPage";

export const Mobile: React.FC = () => (
  <Routes>
    <Route path="/navigation" element={<MobileAppSettingsPage />} />
    <Route path="/theme" element={<AppThemePage />} />
    <Route path="/app" element={<MobilePage />} />
    <Route path="/checkin" element={<CheckInPage />} />
    <Route path="/" element={<Navigate to="navigation" replace />} />
  </Routes>
);
