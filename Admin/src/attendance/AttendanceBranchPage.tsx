import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Icon, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { ApiHelper, Loading, Locale, PageHeader } from "@machonharuach/apphelper";
import {
  getLinkedStreamingId,
  type LiveStreamAttendanceLinks
} from "../sermons/helpers/attendanceSchedule";
import {
  loadAttendanceStreamLinks,
  removeAttendanceStreamLink,
  removeLinksForStreamingService
} from "../sermons/helpers/attendanceStreamLinks";
import { useQuery } from "@tanstack/react-query";
import type { CampusInterface, GenericSettingInterface, ServiceInterface, ServiceTimeInterface } from "@machonharuach/helpers";
import { ServiceEdit } from "./components/ServiceEdit";
import { ServiceTimeEdit } from "./components/ServiceTimeEdit";

const OTHER_CATEGORY_LABEL = "Other Category";
const PLANNING_SETTINGS_KEY = "attendanceBranchPlanning";
type QrModalState = {
  open: boolean;
  itemType: "service" | "event";
  itemId: string;
  title: string;
  imageUrl: string;
  filename: string;
  dateOptions: string[];
  selectedDate: string;
};

interface ServicePlanFields {
  date?: string;
  time?: string;
  streamType?: string;
  streamData?: string;
  streamLink?: string;
  advertisementImage?: string;
  morningPrayerLead?: string;
  mc?: string;
  praiseWorshipTeam?: string;
  apostlesCreedLead?: string;
  announcementsLead?: string;
  preacher?: string;
}

interface EventPlanFields {
  fromDate?: string;
  toDate?: string;
  startTime?: string;
  endTime?: string;
  streamType?: string;
  streamData?: string;
  streamLink?: string;
  advertisementImage?: string;
  mc?: string;
  announcementsLead?: string;
  eventLeader?: string;
}

interface BranchPlanningSettings {
  services: Record<string, ServicePlanFields>;
  events: Record<string, EventPlanFields>;
}

const DEFAULT_PLANNING: BranchPlanningSettings = { services: {}, events: {} };

export const AttendanceBranchPage = () => {
  const navigate = useNavigate();
  const { branchId } = useParams<{ branchId: string }>();
  const [selectedMode, setSelectedMode] = React.useState<"services" | "events">("services");
  const [selectedService, setSelectedService] = React.useState<ServiceInterface>(null);
  const [selectedServiceTime, setSelectedServiceTime] = React.useState<ServiceTimeInterface>(null);
  const [planning, setPlanning] = React.useState<BranchPlanningSettings>(DEFAULT_PLANNING);
  const [planningSetting, setPlanningSetting] = React.useState<GenericSettingInterface | null>(null);
  const [isSavingPlanning, setIsSavingPlanning] = React.useState(false);
  const [qrModal, setQrModal] = React.useState<QrModalState>({
    open: false,
    itemType: "service",
    itemId: "",
    title: "",
    imageUrl: "",
    filename: "",
    dateOptions: [],
    selectedDate: ""
  });
  const [isDownloadingQr, setIsDownloadingQr] = React.useState(false);
  const hasLoadedPlanning = React.useRef(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const campus = useQuery<CampusInterface>({
    queryKey: [`/campuses/${branchId}`, "AttendanceApi"],
    enabled: !!branchId
  });

  const services = useQuery<ServiceInterface[]>({
    queryKey: ["/services", "AttendanceApi"],
    placeholderData: []
  });

  const serviceTimes = useQuery<ServiceTimeInterface[]>({
    queryKey: ["/servicetimes", "AttendanceApi"],
    placeholderData: []
  });

  const refetchAll = React.useCallback(() => {
    campus.refetch();
    services.refetch();
    serviceTimes.refetch();
    setSelectedService(null);
    setSelectedServiceTime(null);
  }, [campus, services, serviceTimes]);

  const loadPlanning = React.useCallback(async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const setting = allSettings.find((s) => s.keyName === PLANNING_SETTINGS_KEY) || null;
    setPlanningSetting(setting);
    if (!setting?.value) {
      setPlanning(DEFAULT_PLANNING);
      return;
    }
    try {
      const parsed = JSON.parse(setting.value);
      setPlanning({
        services: parsed?.services || {},
        events: parsed?.events || {}
      });
    } catch {
      setPlanning(DEFAULT_PLANNING);
    }
  }, []);

  React.useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const getAddress = React.useCallback((c?: CampusInterface) => {
    if (!c) return "";
    const ext = c as any;
    const line1 = [ext.address1, ext.address2].filter(Boolean).join(", ");
    const line2 = [ext.city, ext.state, ext.zip, ext.country].filter(Boolean).join(", ");
    if (line1 && line2) return `${line1} • ${line2}`;
    return line1 || line2 || "Address not set";
  }, []);

  const branchServices = React.useMemo(
    () => services.data.filter((s) => s.campusId === branchId).sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [services.data, branchId]
  );
  const branchServiceIds = React.useMemo(() => new Set(branchServices.map((s) => s.id)), [branchServices]);
  const defaultBranchServiceId = branchServices[0]?.id || "";
  const branchEvents = React.useMemo(
    () => serviceTimes.data
      .filter((st) => branchServiceIds.has(st.serviceId || ""))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [serviceTimes.data, branchServiceIds]
  );

  const updateServicePlan = (serviceId: string, field: keyof ServicePlanFields, value: string) => {
    setPlanning((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        [serviceId]: {
          ...(prev.services[serviceId] || {}),
          [field]: value
        }
      }
    }));
  };

  const updateEventPlan = (serviceTimeId: string, field: keyof EventPlanFields, value: string) => {
    setPlanning((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [serviceTimeId]: {
          ...(prev.events[serviceTimeId] || {}),
          [field]: value
        }
      }
    }));
  };

  const persistPlanning = async (planningToSave: BranchPlanningSettings) => {
    setIsSavingPlanning(true);
    try {
      const setting: GenericSettingInterface = planningSetting || { keyName: PLANNING_SETTINGS_KEY, public: 0 };
      if (!setting.churchId && campus.data?.churchId) setting.churchId = campus.data.churchId;
      setting.public = 1;
      setting.value = JSON.stringify(planningToSave);
      const saved = await ApiHelper.post("/settings", [setting], "MembershipApi");
      if (saved?.[0]) setPlanningSetting(saved[0]);
    } finally {
      setIsSavingPlanning(false);
    }
  };

  const savePlanning = async () => {
    await persistPlanning(planning);
  };

  const removeLiveStreamForAttendanceItem = async (
    churchId: string,
    sourceType: "service" | "event",
    sourceId: string,
    linksBundle?: { links: LiveStreamAttendanceLinks; setting: GenericSettingInterface | null }
  ) => {
    if (!churchId || !sourceId) return;
    const { links, setting } = linksBundle || await loadAttendanceStreamLinks();
    const streamId = getLinkedStreamingId(links, sourceType, sourceId);
    if (streamId) {
      await ApiHelper.delete("/streamingServices/" + streamId, "ContentApi");
      await removeLinksForStreamingService(streamId, churchId, setting, links);
    } else {
      await removeAttendanceStreamLink(sourceType, sourceId, churchId, setting, links);
    }
  };

  const handleDeleteService = async (service: ServiceInterface) => {
    if (!service?.id) return;
    if (!window.confirm(Locale.label("attendance.serviceEdit.confirmDelete"))) return;

    const churchId = campus.data?.churchId || "";
    const childEvents = serviceTimes.data.filter((st) => st.serviceId === service.id);
    const linksBundle = await loadAttendanceStreamLinks();

    for (const ev of childEvents) {
      if (ev.id) {
        await removeLiveStreamForAttendanceItem(churchId, "event", ev.id, linksBundle);
        await ApiHelper.delete("/servicetimes/" + ev.id, "AttendanceApi");
      }
    }
    await removeLiveStreamForAttendanceItem(churchId, "service", service.id, linksBundle);
    await ApiHelper.delete("/services/" + service.id, "AttendanceApi");

    const nextPlanning: BranchPlanningSettings = {
      services: { ...planning.services },
      events: { ...planning.events }
    };
    delete nextPlanning.services[service.id];
    childEvents.forEach((ev) => {
      if (ev.id) delete nextPlanning.events[ev.id];
    });
    setPlanning(nextPlanning);
    await persistPlanning(nextPlanning);
    refetchAll();
  };

  const handleDeleteEvent = async (event: ServiceTimeInterface) => {
    if (!event?.id) return;
    if (!window.confirm(Locale.label("attendance.serviceTimeEdit.confirmDelete"))) return;

    const churchId = campus.data?.churchId || "";
    await removeLiveStreamForAttendanceItem(churchId, "event", event.id);
    await ApiHelper.delete("/servicetimes/" + event.id, "AttendanceApi");

    const nextPlanning: BranchPlanningSettings = {
      services: { ...planning.services },
      events: { ...planning.events }
    };
    delete nextPlanning.events[event.id];
    setPlanning(nextPlanning);
    await persistPlanning(nextPlanning);
    refetchAll();
  };

  const buildQrImageUrl = React.useCallback((data: string) => {
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=12&data=${encoded}`;
  }, []);

  const buildDateOptions = React.useCallback((fromDate?: string, toDate?: string) => {
    if (!fromDate) return [];
    if (!toDate || toDate < fromDate) return [fromDate];
    const dates: string[] = [];
    const current = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) return [fromDate];
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  const buildQrTargetUrl = React.useCallback((type: "service" | "event", id: string, date: string) => {
    const baseUrl = `${window.location.origin}/attendance/branch/${branchId || ""}`;
    const params = new URLSearchParams({ tab: type, id: id || "" });
    if (type === "event" && date) params.set("date", date);
    return `${baseUrl}?${params.toString()}`;
  }, [branchId]);

  const openQrModal = React.useCallback((type: "service" | "event", item: { id?: string; name?: string }, eventPlan?: EventPlanFields) => {
    const safeId = item.id || "";
    const safeName = item.name || type;
    const dateOptions = type === "event" ? buildDateOptions(eventPlan?.fromDate, eventPlan?.toDate) : [];
    const selectedDate = dateOptions[0] || "";
    const targetUrl = buildQrTargetUrl(type, safeId, selectedDate);
    const imageUrl = buildQrImageUrl(targetUrl);
    const filename = `${type}-${safeName}`.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
    setQrModal({
      open: true,
      itemType: type,
      itemId: safeId,
      title: `${safeName} QR Code`,
      imageUrl,
      filename,
      dateOptions,
      selectedDate
    });
  }, [buildDateOptions, buildQrImageUrl, buildQrTargetUrl]);

  const handleQrDateChange = (value: string) => {
    setQrModal((prev) => {
      const targetUrl = buildQrTargetUrl(prev.itemType, prev.itemId, value);
      return {
        ...prev,
        selectedDate: value,
        imageUrl: buildQrImageUrl(targetUrl)
      };
    });
  };

  const handleDownloadQr = async () => {
    if (!qrModal.imageUrl) return;
    setIsDownloadingQr(true);
    try {
      const response = await fetch(qrModal.imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${qrModal.filename || "attendance-item"}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  React.useEffect(() => {
    if (!hasLoadedPlanning.current) {
      hasLoadedPlanning.current = true;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistPlanning(planning);
    }, 700);
  }, [planning]);

  const isLoading = campus.isLoading || services.isLoading || serviceTimes.isLoading;
  if (isLoading) return <Loading />;

  return (
    <>
      <PageHeader title={campus.data?.name || "Branch"} subtitle={getAddress(campus.data)}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate("/attendance")}
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
          >
            Back to Structure
          </Button>
          <Button
            variant="outlined"
            onClick={savePlanning}
            disabled={isSavingPlanning}
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
          >
            {isSavingPlanning ? "Saving..." : "Save Planning"}
          </Button>
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3, position: "relative", isolation: "isolate" }}>
        <Box
          sx={{
            mb: 2.5,
            p: 0.75,
            position: "sticky",
            top: 0,
            zIndex: 1400,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "rgba(255,255,255,0.12)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(4px)"
          }}
        >
          <Tabs
            value={selectedMode}
            onChange={(_event, value: "services" | "events") => setSelectedMode(value)}
            variant="fullWidth"
            TabIndicatorProps={{ style: { display: "none" } }}
            sx={{ minHeight: 0, "& .MuiTabs-flexContainer": { gap: 1 } }}
          >
            <Tab
              value="services"
              disableRipple
              label={(
                <Box sx={{ textAlign: "left" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>Services</Typography>
                  <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>Manage branch services</Typography>
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
                "&.Mui-selected": {
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.2)"
                }
              }}
            />
            <Tab
              value="events"
              disableRipple
              label={(
                <Box sx={{ textAlign: "left" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>Events</Typography>
                  <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>Manage service events</Typography>
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
                "&.Mui-selected": {
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.2)"
                }
              }}
            />
          </Tabs>
        </Box>

        <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }}>
          <ServiceEdit
            service={selectedService}
            updatedFunction={refetchAll}
            fixedCampusId={branchId}
            fixedCampusName={campus.data?.name || "Selected Campus"}
            planningFields={selectedService?.id ? (planning.services[selectedService.id] || {}) : {}}
            onPlanningFieldChange={(field, value) => {
              if (!selectedService?.id) return;
              updateServicePlan(selectedService.id, field as keyof ServicePlanFields, value);
            }}
          />
          <ServiceTimeEdit
            serviceTime={selectedServiceTime}
            updatedFunction={refetchAll}
            fixedBranchName={campus.data?.name || "Selected Branch"}
            defaultServiceId={defaultBranchServiceId}
            allowedServiceIds={[...branchServiceIds].filter((id): id is string => !!id)}
            planningFields={selectedServiceTime?.id ? (planning.events[selectedServiceTime.id] || {}) : {}}
            onPlanningFieldChange={(field, value) => {
              if (!selectedServiceTime?.id) return;
              updateEventPlan(selectedServiceTime.id, field as keyof EventPlanFields, value);
            }}
          />

          {selectedMode === "services" && (
            <>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  size="small"
                  startIcon={<Icon>add</Icon>}
                  onClick={() => setSelectedService({ id: "", campusId: branchId || "", name: "" })}
                >
                  Add Service
                </Button>
              </Stack>

              {branchServices.length === 0 && (
                <Paper sx={{ p: 3, border: "1px solid var(--border-main)" }}>
                  <Typography variant="body2" color="text.secondary">No services added for this branch yet.</Typography>
                </Paper>
              )}

              {branchServices.map((service) => {
                const servicePlan = service.id ? (planning.services[service.id] || {}) : {};
                const leader = servicePlan.preacher || servicePlan.mc || servicePlan.morningPrayerLead || "";
                const adImage = String(servicePlan.advertisementImage || "").trim();
                return (
                  <Paper
                    key={service.id || service.name}
                    sx={{
                      p: 1.5,
                      border: "1px solid var(--border-main)",
                      borderRadius: 2.25,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
                    }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.75} alignItems={{ xs: "flex-start", md: "center" }}>
                      <Box
                        sx={{
                          width: { xs: "100%", md: 164 },
                          minWidth: { xs: "100%", md: 164 },
                          height: 94,
                          borderRadius: 1.5,
                          overflow: "hidden",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {adImage ? (
                          <Box component="img" src={adImage} alt={`${service.name} ad`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Stack spacing={0.25} alignItems="center" color="text.secondary">
                            <Icon sx={{ fontSize: 20 }}>image</Icon>
                            <Typography variant="caption">No Ad Image</Typography>
                          </Stack>
                        )}
                      </Box>

                      <Stack spacing={1.1} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Icon sx={{ fontSize: 20, color: "text.secondary" }}>calendar_month</Icon>
                            <Button
                              variant="text"
                              onClick={() => setSelectedService(service)}
                              sx={{ textTransform: "none", p: 0, minWidth: "auto", fontWeight: 700, fontSize: "1rem" }}
                            >
                              {service.name}
                            </Button>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              aria-label={`Generate QR code for ${service.name || "service"}`}
                              onClick={() => openQrModal("service", service)}
                              sx={{ textTransform: "none", minWidth: 40, px: 1 }}
                            >
                              <Icon sx={{ fontSize: 20 }}>qr_code_2</Icon>
                            </Button>
                            <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
                              <IconButton
                                size="small"
                                variant="outlined"
                                aria-label={`Delete ${service.name || "service"}`}
                                onClick={() => handleDeleteService(service)}
                                sx={{
                                  borderColor: "var(--border-main)",
                                  color: "error.main",
                                  "&:hover": { backgroundColor: "error.main", color: "white", borderColor: "error.main" }
                                }}
                              >
                                <Icon sx={{ fontSize: 20 }}>delete</Icon>
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                            <Typography variant="caption" color="text.secondary"><strong>Date:</strong> {servicePlan.date || "--"}</Typography>
                          </Box>
                          <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                            <Typography variant="caption" color="text.secondary"><strong>Time:</strong> {servicePlan.time || "--"}</Typography>
                          </Box>
                          <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                            <Typography variant="caption" color="text.secondary"><strong>Preacher/Leader:</strong> {leader || "--"}</Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </>
          )}

          {selectedMode === "events" && (
            <>
              {branchServices.length === 0 && (
                <Paper sx={{ p: 3, border: "1px solid var(--border-main)" }}>
                  <Typography variant="body2" color="text.secondary">No services available yet. Add a service first.</Typography>
                </Paper>
              )}

              {branchServices.length > 0 && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    size="small"
                    startIcon={<Icon sx={{ fontSize: 16 }}>add</Icon>}
                    onClick={() => setSelectedServiceTime({ id: "", serviceId: defaultBranchServiceId, name: "" })}
                  >
                    Add Event
                  </Button>
                </Stack>
              )}

              {branchServices.length > 0 && branchEvents.length === 0 && (
                <Paper sx={{ p: 3, border: "1px solid var(--border-main)" }}>
                  <Typography variant="body2" color="text.secondary">No events added for this branch yet.</Typography>
                </Paper>
              )}

              {branchEvents.map((event) => {
                const eventPlan = event.id ? (planning.events[event.id] || {}) : {};
                const eventLeader = eventPlan.eventLeader || eventPlan.mc || "";
                const adImage = String(eventPlan.advertisementImage || "").trim();
                const dateRange = eventPlan.fromDate && eventPlan.toDate
                  ? `${eventPlan.fromDate} to ${eventPlan.toDate}`
                  : (eventPlan.fromDate || eventPlan.toDate || "--");
                const timeRange = eventPlan.startTime && eventPlan.endTime
                  ? `${eventPlan.startTime} - ${eventPlan.endTime}`
                  : (eventPlan.startTime || eventPlan.endTime || "--");

                return (
                  <Paper
                    key={event.id || event.name}
                    sx={{
                      p: 1.5,
                      border: "1px solid var(--border-main)",
                      borderRadius: 2.25,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.75} alignItems={{ xs: "flex-start", md: "center" }}>
                        <Box
                          sx={{
                            width: { xs: "100%", md: 164 },
                            minWidth: { xs: "100%", md: 164 },
                            height: 94,
                            borderRadius: 1.5,
                            overflow: "hidden",
                            border: "1px solid var(--border-main)",
                            backgroundColor: "rgba(255,255,255,0.03)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {adImage ? (
                            <Box component="img" src={adImage} alt={`${event.name} ad`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <Stack spacing={0.25} alignItems="center" color="text.secondary">
                              <Icon sx={{ fontSize: 20 }}>image</Icon>
                              <Typography variant="caption">No Ad Image</Typography>
                            </Stack>
                          )}
                        </Box>
                        <Stack spacing={1.1} sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Icon sx={{ fontSize: 18, color: "text.secondary" }}>schedule</Icon>
                              <Button variant="text" onClick={() => setSelectedServiceTime(event)} sx={{ textTransform: "none", p: 0, minWidth: "auto", fontWeight: 700, fontSize: "1rem" }}>
                                {event.name}
                              </Button>
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                aria-label={`Generate QR code for ${event.name || "event"}`}
                                onClick={() => openQrModal("event", event, eventPlan)}
                                sx={{ textTransform: "none", minWidth: 40, px: 1 }}
                              >
                                <Icon sx={{ fontSize: 20 }}>qr_code_2</Icon>
                              </Button>
                              <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
                                <IconButton
                                  size="small"
                                  variant="outlined"
                                  aria-label={`Delete ${event.name || "event"}`}
                                  onClick={() => handleDeleteEvent(event)}
                                  sx={{
                                    borderColor: "var(--border-main)",
                                    color: "error.main",
                                    "&:hover": { backgroundColor: "error.main", color: "white", borderColor: "error.main" }
                                  }}
                                >
                                  <Icon sx={{ fontSize: 20 }}>delete</Icon>
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                              <Typography variant="caption" color="text.secondary"><strong>Date:</strong> {dateRange}</Typography>
                            </Box>
                            <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                              <Typography variant="caption" color="text.secondary"><strong>Time:</strong> {timeRange}</Typography>
                            </Box>
                            <Box sx={{ px: 1.1, py: 0.6, borderRadius: 999, border: "1px solid var(--border-main)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                              <Typography variant="caption" color="text.secondary"><strong>Leader:</strong> {eventLeader || "--"}</Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </>
          )}
        </Stack>
      </Box>
      <Dialog open={qrModal.open} onClose={() => setQrModal((prev) => ({ ...prev, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>{qrModal.title}</DialogTitle>
        <DialogContent>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 1 }}>
            {qrModal.dateOptions.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel id="qr-event-date">Event Date</InputLabel>
                <Select
                  labelId="qr-event-date"
                  label="Event Date"
                  value={qrModal.selectedDate}
                  onChange={(e) => handleQrDateChange(e.target.value)}
                >
                  {qrModal.dateOptions.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {qrModal.imageUrl && (
              <Box component="img" src={qrModal.imageUrl} alt={qrModal.title} sx={{ width: "100%", maxWidth: 320, borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              Scan this QR code to open this specific item{qrModal.selectedDate ? ` for ${qrModal.selectedDate}` : ""}.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrModal((prev) => ({ ...prev, open: false }))}>Close</Button>
          <Button onClick={handleDownloadQr} variant="contained" disabled={isDownloadingQr}>
            {isDownloadingQr ? "Downloading..." : "Download"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

