import React, { Suspense, useEffect } from "react";
import { Routes, Route, useNavigate, Outlet, Navigate, useParams } from "react-router-dom";
import { Wrapper, ErrorBoundary } from "./components";
import { UserHelper } from "@machonharuach/apphelper";
import { Box, CircularProgress, Typography } from "@mui/material";
import UserContext from "./UserContext";
import { Settings } from "./settings/Settings";

// Lazy load all page components for code splitting
const PeoplePage = React.lazy(() => import("./people/PeoplePage").then((module) => ({ default: module.PeoplePage })));
const PersonPage = React.lazy(() => import("./people/PersonPage").then((module) => ({ default: module.PersonPage })));
const GroupsPage = React.lazy(() => import("./groups/GroupsPage"));
const GroupPage = React.lazy(() => import("./groups/GroupPage").then((module) => ({ default: module.GroupPage })));
const AttendancePage = React.lazy(() => import("./attendance/AttendancePage").then((module) => ({ default: module.AttendancePage })));
const AttendanceBranchPage = React.lazy(() => import("./attendance/AttendanceBranchPage").then((module) => ({ default: module.AttendanceBranchPage })));
const DonationsPage = React.lazy(() => import("./donations/DonationsPage").then((module) => ({ default: module.DonationsPage })));
const DonationBatchPage = React.lazy(() => import("./donations/DonationBatchPage").then((module) => ({ default: module.DonationBatchPage })));
const FundPage = React.lazy(() => import("./donations/FundPage").then((module) => ({ default: module.FundPage })));
const FormsPage = React.lazy(() => import("./forms/FormsPage").then((module) => ({ default: module.FormsPage })));
// Settings is imported eagerly to avoid dynamic-import fetch failures in some dev setups.
const FormPage = React.lazy(() => import("./forms/FormPage").then((module) => ({ default: module.FormPage })));
const ReportsPage = React.lazy(() => import("./reports/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const ReportPage = React.lazy(() => import("./reports/ReportPage").then((module) => ({ default: module.ReportPage })));
const AdminReportPage = React.lazy(() => import("./serverAdmin/ReportPage").then((module) => ({ default: module.ReportPage })));
const TasksPage = React.lazy(() => import("./serving/tasks/TasksPage").then((module) => ({ default: module.TasksPage })));
const TaskPage = React.lazy(() => import("./serving/tasks/TaskPage").then((module) => ({ default: module.TaskPage })));
const AutomationsPage = React.lazy(() => import("./serving/tasks/automations/AutomationsPage").then((module) => ({ default: module.AutomationsPage })));
const DashboardPage = React.lazy(() => import("./dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const QuickActionsPage = React.lazy(() => import("./dashboard/QuickActionsPage").then((module) => ({ default: module.QuickActionsPage })));
const AdminPage = React.lazy(() => import("./serverAdmin/AdminPage").then((module) => ({ default: module.AdminPage })));
const ProfilePage = React.lazy(() => import("./profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const ServingPage = React.lazy(() => import("./serving/ServingPage").then((module) => ({ default: module.ServingPage })));
const PlanPage = React.lazy(() => import("./serving/plans/PlanPage").then((module) => ({ default: module.PlanPage })));
const PlanTypePage = React.lazy(() => import("./serving/planTypes/PlanTypePage").then((module) => ({ default: module.PlanTypePage })));
const DonationBatchesPage = React.lazy(() => import("./donations/DonationBatchesPage").then((module) => ({ default: module.DonationBatchesPage })));
const DonorboxReconciliationPage = React.lazy(() => import("./donations/DonorboxReconciliationPage").then((module) => ({ default: module.DonorboxReconciliationPage })));
const FundsPage = React.lazy(() => import("./donations/FundsPage").then((module) => ({ default: module.FundsPage })));
const SongsPage = React.lazy(() => import("./serving/songs/SongsPage").then((module) => ({ default: module.SongsPage })));
const SongPage = React.lazy(() => import("./serving/songs/SongPage").then((module) => ({ default: module.SongPage })));
const PrintPlan = React.lazy(() => import("./serving/plans/PrintPlan").then((module) => ({ default: module.PrintPlan })));
const DevicesPage = React.lazy(() => import("./profile/DevicesPage").then((module) => ({ default: module.DevicesPage })));
const PrintDonationPage = React.lazy(() => import("./donations/PrintDonationPage").then((module) => ({ default: module.PrintDonationPage })));
const PrintAllStatementsPage = React.lazy(() => import("./donations/PrintAllStatementsPage").then((module) => ({ default: module.PrintAllStatementsPage })));
const BatchGivingStatementsPage = React.lazy(() => import("./donations/BatchGivingStatementsPage").then((module) => ({ default: module.BatchGivingStatementsPage })));
const OAuthPage = React.lazy(() => import("./OAuth").then((module) => ({ default: module.OAuthPage })));
const DeviceAuthPage = React.lazy(() => import("./device/DeviceAuthPage").then((module) => ({ default: module.DeviceAuthPage })));
const SermonsPage = React.lazy(() => import("./sermons/SermonsPage").then((module) => ({ default: module.SermonsPage })));
const PlaylistsPage = React.lazy(() => import("./sermons/PlaylistsPage").then((module) => ({ default: module.PlaylistsPage })));
const LiveStreamTimesPage = React.lazy(() => import("./sermons/LiveStreamTimesPage").then((module) => ({ default: module.LiveStreamTimesPage })));
const BulkImportPage = React.lazy(() => import("./sermons/BulkImportPage").then((module) => ({ default: module.BulkImportPage })));
const CalendarsPage = React.lazy(() => import("./calendars/CalendarsPage").then((module) => ({ default: module.CalendarsPage })));
const CalendarPage = React.lazy(() => import("./calendars/CalendarPage").then((module) => ({ default: module.CalendarPage })));
const RegistrationsPage = React.lazy(() => import("./registrations/RegistrationsPage").then((module) => ({ default: module.RegistrationsPage })));
const RegistrationDetailsPage = React.lazy(() => import("./registrations/RegistrationDetailsPage").then((module) => ({ default: module.RegistrationDetailsPage })));
const Site = React.lazy(() => import("./site").then((module) => ({ default: module.Site })));
const CommunicationsPage = React.lazy(() => import("./communications").then((module) => ({ default: module.CommunicationsPage })));
const Mobile = React.lazy(() => import("./mobile").then((module) => ({ default: module.Mobile })));
const EmailTemplatesPage = React.lazy(() => import("./settings/EmailTemplatesPage").then((module) => ({ default: module.EmailTemplatesPage })));

// Loading component for Suspense fallback
const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" flexDirection="column" gap={2}>
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

/** Legacy Ministry URLs → Media (Songs) */
const ServingSongsListRedirect: React.FC = () => <Navigate to="/sermons/songs" replace />;
const ServingSongIdRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/sermons/songs/${id ?? ""}`} replace />;
};

export const Authenticated: React.FC = () => {
  const navigate = useNavigate();

  const context = React.useContext(UserContext);

  UserHelper.currentUserChurch = context.userChurch;
  UserHelper.userChurches = context.userChurches;
  UserHelper.user = context.user;
  UserHelper.person = context.person;

  useEffect(() => {
    // Spirit Embassy-focused deployment: auto-select default church when available.
    if (!context?.userChurches || context.userChurches.length === 0) return;
    if (context.userChurch?.church?.id) return;

    const preferredId = (process.env.REACT_APP_DEFAULT_CHURCH_ID || "").trim();
    const normalize = (s: string) => (s || "").toLowerCase().trim();

    const byId = preferredId
      ? context.userChurches.find((uc) => uc?.church?.id === preferredId)
      : undefined;
    const byName = context.userChurches.find((uc) => normalize(uc?.church?.name).includes("spirit embassy"));
    const bySubdomain = context.userChurches.find((uc) => normalize(uc?.church?.subDomain).includes("spirit"));

    const chosen = byId || byName || bySubdomain || context.userChurches[0];
    if (!chosen) return;

    const lockToSingleChurch = (process.env.REACT_APP_LOCK_CHURCH_ID || "").toLowerCase() === "true";
    if (lockToSingleChurch) {
      context.setUserChurches([chosen]);
    }
    context.setUserChurch(chosen);
  }, [context]);

  const LayoutWithWrapper: React.FC = () => (
    <Box sx={{ display: "flex" }}>
      <Wrapper>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {/* This renders the nested child route */}
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Wrapper>
    </Box>
  );

  if (UserHelper.churchChanged) {
    UserHelper.churchChanged = false;
    navigate("/");
  } else {
    return (
      <Routes>
        <Route element={<LayoutWithWrapper />}>
          <Route path="/admin/report/:keyName" element={<AdminReportPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/people/add" element={<PersonPage />} />
          <Route path="/people/:id" element={<PersonPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/groups/:id" element={<GroupPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/attendance/branch/:branchId" element={<AttendanceBranchPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/donations/funds/:id" element={<FundPage />} />
          <Route path="/donations/funds" element={<FundsPage />} />
          <Route path="/donations/batches/:id" element={<DonationBatchPage />} />
          <Route path="/donations/batches" element={<DonationBatchesPage />} />
          <Route path="/donations/stripe-import" element={<DonorboxReconciliationPage />} />
          <Route path="/donations/donorbox-reconciliation" element={<DonorboxReconciliationPage />} />
          <Route path="/donations/statements" element={<BatchGivingStatementsPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/forms/:id" element={<FormPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/reports/:keyName" element={<ReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/email-templates" element={<EmailTemplatesPage />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/serving/tasks/automations" element={<AutomationsPage />} />
          <Route path="/serving/tasks/:id" element={<TaskPage />} />
          <Route path="/serving/tasks" element={<TasksPage />} />
          <Route path="/profile/devices" element={<DevicesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/serving/planTypes/:id" element={<PlanTypePage />} />
          <Route path="/serving/plans/:id" element={<PlanPage />} />
          <Route path="/serving" element={<ServingPage />} />
          <Route path="/serving/songs" element={<ServingSongsListRedirect />} />
          <Route path="/serving/songs/:id" element={<ServingSongIdRedirect />} />
          <Route path="/sermons/songs/:id" element={<SongPage />} />
          <Route path="/sermons/songs" element={<SongsPage />} />
          <Route path="/sermons/playlists" element={<PlaylistsPage />} />
          <Route path="/sermons/times" element={<LiveStreamTimesPage />} />
          <Route path="/sermons/bulk" element={<BulkImportPage />} />
          <Route path="/sermons" element={<SermonsPage />} />
          <Route path="/registrations/:eventId" element={<RegistrationDetailsPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/calendars/:id" element={<CalendarPage />} />
          <Route path="/calendars" element={<CalendarsPage />} />
          <Route path="/communications/history" element={<CommunicationsPage />} />
          <Route path="/communications" element={<CommunicationsPage />} />
          <Route path="/site/*" element={<Site />} />
          <Route path="/mobile/*" element={<Mobile />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<QuickActionsPage />} />
        </Route>

        <Route
          path="/oauth"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <OAuthPage />
            </Suspense>
          }
        />
        <Route
          path="/device"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <DeviceAuthPage />
            </Suspense>
          }
        />
        <Route
          path="/donations/print/:personId"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <PrintDonationPage />
            </Suspense>
          }
        />
        <Route
          path="/donations/print-all"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <PrintAllStatementsPage />
            </Suspense>
          }
        />
        <Route
          path="/serving/plans/print/:id"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <PrintPlan />
            </Suspense>
          }
        />
      </Routes>
    );
  }
};
