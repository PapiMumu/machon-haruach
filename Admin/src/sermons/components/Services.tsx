import { Button, Typography, Stack, Chip, Divider, IconButton, Tooltip } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, VideoCall as VideoCallIcon } from "@mui/icons-material";
import React from "react";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { DateHelper } from "@machonharuach/apphelper";
import { UserHelper } from "@machonharuach/apphelper";
import { DisplayBox } from "@machonharuach/apphelper";
import type { CampusInterface, ServiceInterface, ServiceTimeInterface, StreamingServiceInterface } from "@machonharuach/helpers";
import { ServiceEdit } from "./ServiceEdit";
import { TableList } from "./TableList";
import { YouTubeStreamBanner } from "./YouTubeStreamBanner";
import { AttendanceScheduleList } from "./AttendanceScheduleList";
import {
  ATTENDANCE_PLANNING_KEY,
  attendanceItemToStreamingService,
  buildAttendanceScheduleItems,
  buildLinkedIdSet,
  getLinkedStreamingId,
  parsePlanningSettings,
  type AttendanceScheduleItem
} from "../helpers/attendanceSchedule";
import { DEFAULT_STREAMING_TIME_ZONE } from "../helpers/streamingTimeZones";
import {
  loadAttendanceStreamLinks,
  removeAttendanceStreamLink,
  removeLinksForStreamingService
} from "../helpers/attendanceStreamLinks";
import type { GenericSettingInterface } from "@machonharuach/helpers";

export const Services: React.FC = () => {
  const [services, setServices] = React.useState<StreamingServiceInterface[]>([]);
  const [currentService, setCurrentService] = React.useState<StreamingServiceInterface>(null);
  const [attendanceLink, setAttendanceLink] = React.useState<{ sourceType: "service" | "event"; sourceId: string } | null>(null);
  const [attendanceItems, setAttendanceItems] = React.useState<AttendanceScheduleItem[]>([]);
  const [linkedIds, setLinkedIds] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = React.useState(true);

  const churchId = UserHelper.currentUserChurch?.church?.id || "";

  const handleUpdated = () => {
    setCurrentService(null);
    setAttendanceLink(null);
    loadData();
  };

  const loadAttendanceData = React.useCallback(async () => {
    setIsAttendanceLoading(true);
    try {
      const [attendanceServices, serviceTimes, campuses, settings, linkData] = await Promise.all([
        ApiHelper.get("/services", "AttendanceApi") as Promise<ServiceInterface[]>,
        ApiHelper.get("/servicetimes", "AttendanceApi") as Promise<ServiceTimeInterface[]>,
        ApiHelper.get("/campuses", "AttendanceApi") as Promise<CampusInterface[]>,
        ApiHelper.get("/settings", "MembershipApi") as Promise<GenericSettingInterface[]>,
        loadAttendanceStreamLinks()
      ]);

      const planningSetting = settings.find((s) => s.keyName === ATTENDANCE_PLANNING_KEY);
      const planning = parsePlanningSettings(planningSetting?.value);
      const items = buildAttendanceScheduleItems(attendanceServices, serviceTimes, campuses, planning);
      setAttendanceItems(items);
      setLinkedIds(buildLinkedIdSet(linkData.links));
    } finally {
      setIsAttendanceLoading(false);
    }
  }, []);

  const loadData = () => {
    Promise.all([
      ApiHelper.get("/streamingServices", "ContentApi").then((data: any) => {
        data.forEach((s: StreamingServiceInterface) => {
          s.serviceTime = new Date(Date.parse(s.serviceTime.toString()));
          s.serviceTime.setMinutes(s.serviceTime.getMinutes() + s.timezoneOffset);
        });
        setServices(data);
      }),
      loadAttendanceData()
    ]).finally(() => setIsLoading(false));
  };

  const getEditContent = () => (
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      onClick={handleAdd}
      data-testid="add-service-button"
      sx={{
        textTransform: "none",
        fontWeight: 600
      }}
    >
      {Locale.label("sermons.liveStreamTimes.servicesTab.addService")}
    </Button>
  );

  const handleAdd = () => {
    const tz = new Date().getTimezoneOffset();
    const defaultDate = getNextSunday();
    defaultDate.setTime(defaultDate.getTime() + (9 * 60 * 60 * 1000));

    const link: StreamingServiceInterface = {
      churchId,
      serviceTime: defaultDate,
      chatBefore: 600,
      chatAfter: 600,
      duration: 3600,
      earlyStart: 600,
      provider: "youtube_live",
      providerKey: "",
      recurring: false,
      timezoneOffset: tz,
      timeZone: DEFAULT_STREAMING_TIME_ZONE,
      videoUrl: "",
      label: "Sunday Morning",
      sermonId: "latest"
    };
    setAttendanceLink(null);
    setCurrentService(link);
  };

  const getNextSunday = () => {
    const result = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    while (result.getDay() !== 0) result.setDate(result.getDate() + 1);
    return result;
  };

  const deleteStreamingService = async (streamingServiceId: string) => {
    const { links, setting } = await loadAttendanceStreamLinks();
    await ApiHelper.delete("/streamingServices/" + streamingServiceId, "ContentApi");
    await removeLinksForStreamingService(streamingServiceId, churchId, setting, links);
    loadData();
  };

  const handleDeleteStreamingService = (service: StreamingServiceInterface) => {
    if (!service?.id) return;
    if (!window.confirm(Locale.label("sermons.liveStreamTimes.serviceEdit.deleteConfirm"))) return;
    void deleteStreamingService(service.id);
  };

  const clearLiveStreamForAttendance = async (
    sourceType: "service" | "event",
    sourceId: string,
    linksBundle?: Awaited<ReturnType<typeof loadAttendanceStreamLinks>>
  ) => {
    const { links, setting } = linksBundle || await loadAttendanceStreamLinks();
    const linkedId = getLinkedStreamingId(links, sourceType, sourceId);
    if (linkedId) {
      await ApiHelper.delete("/streamingServices/" + linkedId, "ContentApi");
      await removeLinksForStreamingService(linkedId, churchId, setting, links);
    } else {
      await removeAttendanceStreamLink(sourceType, sourceId, churchId, setting, links);
    }
  };

  const persistAttendancePlanning = async (planning: ReturnType<typeof parsePlanningSettings>) => {
    const settings = await ApiHelper.get("/settings", "MembershipApi") as GenericSettingInterface[];
    const planningSetting = settings.find((s) => s.keyName === ATTENDANCE_PLANNING_KEY);
    if (!planningSetting) return;
    planningSetting.churchId = churchId;
    planningSetting.value = JSON.stringify(planning);
    await ApiHelper.post("/settings", [planningSetting], "MembershipApi");
  };

  const handleDeleteAttendanceItem = async (item: AttendanceScheduleItem) => {
    const confirmMsg =
      item.sourceType === "service"
        ? Locale.label("attendance.serviceEdit.confirmDelete")
        : Locale.label("attendance.serviceTimeEdit.confirmDelete");
    if (!window.confirm(confirmMsg)) return;

    const linksBundle = await loadAttendanceStreamLinks();
    const allServiceTimes = (await ApiHelper.get("/servicetimes", "AttendanceApi")) as ServiceTimeInterface[];
    const settings = await ApiHelper.get("/settings", "MembershipApi") as GenericSettingInterface[];
    const planningSetting = settings.find((s) => s.keyName === ATTENDANCE_PLANNING_KEY);
    const planning = parsePlanningSettings(planningSetting?.value);

    if (item.sourceType === "service") {
      const childEvents = allServiceTimes.filter((st) => st.serviceId === item.sourceId);
      for (const ev of childEvents) {
        if (ev.id) {
          await clearLiveStreamForAttendance("event", ev.id, linksBundle);
          await ApiHelper.delete("/servicetimes/" + ev.id, "AttendanceApi");
          delete planning.events[ev.id];
        }
      }
      await clearLiveStreamForAttendance("service", item.sourceId, linksBundle);
      await ApiHelper.delete("/services/" + item.sourceId, "AttendanceApi");
      delete planning.services[item.sourceId];
    } else {
      await clearLiveStreamForAttendance("event", item.sourceId, linksBundle);
      await ApiHelper.delete("/servicetimes/" + item.sourceId, "AttendanceApi");
      delete planning.events[item.sourceId];
    }

    await persistAttendancePlanning(planning);
    loadData();
  };

  const handleConfigureFromAttendance = async (item: AttendanceScheduleItem) => {
    const [{ links }, streamList] = await Promise.all([
      loadAttendanceStreamLinks(),
      ApiHelper.get("/streamingServices", "ContentApi") as Promise<StreamingServiceInterface[]>
    ]);
    const linkedId = getLinkedStreamingId(links, item.sourceType, item.sourceId);
    const existing = linkedId ? streamList.find((s) => s.id === linkedId) : null;
    if (existing) {
      existing.serviceTime = new Date(Date.parse(existing.serviceTime.toString()));
      existing.serviceTime.setMinutes(existing.serviceTime.getMinutes() + existing.timezoneOffset);
    }

    setAttendanceLink({ sourceType: item.sourceType, sourceId: item.sourceId });
    if (existing) {
      setCurrentService({ ...existing });
      return;
    }
    setCurrentService(attendanceItemToStreamingService(item, churchId));
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    services.forEach(service => {
      rows.push(
        <tr key={service.id}>
          <td>
            <Stack direction="row" spacing={1} alignItems="center">
              <VideoCallIcon sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {service.label}
              </Typography>
              {service.recurring && (
                <Chip
                  label={Locale.label("sermons.liveStreamTimes.servicesTab.weekly")}
                  size="small"
                  sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
                />
              )}
            </Stack>
          </td>
          <td>
            <Typography variant="body2" color="text.secondary">
              {DateHelper.prettyDateTime(service.serviceTime)}
            </Typography>
          </td>
          <td style={{ textAlign: "right" }}>
            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
              <Tooltip title={Locale.label("common.edit", "Edit")} arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    setAttendanceLink(null);
                    setCurrentService(service);
                  }}
                  sx={{
                    color: "primary.main",
                    "&:hover": { backgroundColor: "primary.main", color: "white" }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {service.id ? (
                <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteStreamingService(service)}
                    sx={{
                      color: "error.main",
                      "&:hover": { backgroundColor: "error.main", color: "white" }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </td>
        </tr>
      );
    });
    return rows;
  };

  const getTable = () => (<TableList rows={getRows()} isLoading={isLoading && !services.length} />);

  React.useEffect(() => { loadData(); }, []);

  if (currentService !== null) {
    return (
      <ServiceEdit
        currentService={currentService}
        updatedFunction={handleUpdated}
        attendanceLink={attendanceLink || undefined}
        onAttendanceLinkSaved={loadAttendanceData}
      />
    );
  }

  return (
    <DisplayBox
      headerIcon="calendar_month"
      headerText={Locale.label("sermons.liveStreamTimes.servicesTab.title")}
      editContent={getEditContent()}
      id="servicesBox"
      data-testid="services-display-box"
    >
      <YouTubeStreamBanner />
      <AttendanceScheduleList
        items={attendanceItems}
        isLoading={isAttendanceLoading}
        linkedStreamingIds={linkedIds}
        onConfigureStream={handleConfigureFromAttendance}
        onDelete={handleDeleteAttendanceItem}
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {Locale.label("sermons.liveStreamTimes.liveStreamSchedule.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("sermons.liveStreamTimes.liveStreamSchedule.subtitle")}
      </Typography>
      {getTable()}
    </DisplayBox>
  );
};
