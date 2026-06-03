import type { CampusInterface, ServiceInterface, ServiceTimeInterface } from "@machonharuach/helpers";
import type { StreamingServiceInterface } from "@machonharuach/helpers";

export const ATTENDANCE_PLANNING_KEY = "attendanceBranchPlanning";
export const LIVE_STREAM_ATTENDANCE_LINKS_KEY = "liveStreamAttendanceLinks";

export interface BranchPlanningSettings {
  services: Record<string, ServicePlanFields>;
  events: Record<string, EventPlanFields>;
}

export interface ServicePlanFields {
  date?: string;
  time?: string;
  streamType?: string;
  streamData?: string;
  streamLink?: string;
  preacher?: string;
  mc?: string;
  morningPrayerLead?: string;
}

export interface EventPlanFields {
  fromDate?: string;
  toDate?: string;
  startTime?: string;
  endTime?: string;
  streamType?: string;
  streamData?: string;
  streamLink?: string;
  eventLeader?: string;
  mc?: string;
}

export interface LiveStreamAttendanceLinks {
  services: Record<string, string>;
  events: Record<string, string>;
}

export interface AttendanceScheduleItem {
  sourceType: "service" | "event";
  sourceId: string;
  name: string;
  campusName: string;
  dateLabel: string;
  timeLabel: string;
  leader: string;
  streamType?: string;
  streamData?: string;
  serviceDate: Date | null;
}

export const parseAttendanceDateTime = (date?: string, time?: string): Date | null => {
  if (!date?.trim()) return null;
  const timePart = (time?.trim() || "09:00").length <= 5 ? time?.trim() || "09:00" : "09:00";
  const parsed = new Date(`${date.trim()}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const mapAttendanceStreamProvider = (streamType?: string) => {
  switch (streamType) {
    case "vimeo":
      return "vimeo_live";
    case "facebook":
      return "facebook_live";
    default:
      return "youtube_live";
  }
};

export const buildAttendanceScheduleItems = (
  services: ServiceInterface[],
  serviceTimes: ServiceTimeInterface[],
  campuses: CampusInterface[],
  planning: BranchPlanningSettings
): AttendanceScheduleItem[] => {
  const campusById = new Map(campuses.map((c) => [c.id, c.name || ""]));
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const items: AttendanceScheduleItem[] = [];

  for (const service of services) {
    if (!service.id) continue;
    const plan = planning.services[service.id] || {};
    const leader = plan.preacher || plan.mc || plan.morningPrayerLead || "";
    items.push({
      sourceType: "service",
      sourceId: service.id,
      name: service.name || "Service",
      campusName: campusById.get(service.campusId || "") || "",
      dateLabel: plan.date || "—",
      timeLabel: plan.time || "—",
      leader,
      streamType: plan.streamType,
      streamData: plan.streamData,
      serviceDate: parseAttendanceDateTime(plan.date, plan.time)
    });
  }

  for (const event of serviceTimes) {
    if (!event.id) continue;
    const parent = serviceById.get(event.serviceId || "");
    const plan = planning.events[event.id] || {};
    const leader = plan.eventLeader || plan.mc || "";
    const dateRange =
      plan.fromDate && plan.toDate
        ? `${plan.fromDate} – ${plan.toDate}`
        : plan.fromDate || plan.toDate || "—";
    const timeRange =
      plan.startTime && plan.endTime
        ? `${plan.startTime} – ${plan.endTime}`
        : plan.startTime || plan.endTime || "—";
    items.push({
      sourceType: "event",
      sourceId: event.id,
      name: event.name || event.longName || "Event",
      campusName: campusById.get(parent?.campusId || "") || "",
      dateLabel: dateRange,
      timeLabel: timeRange,
      leader,
      streamType: plan.streamType,
      streamData: plan.streamData,
      serviceDate: parseAttendanceDateTime(plan.fromDate || plan.toDate, plan.startTime)
    });
  }

  return items.sort((a, b) => {
    if (a.serviceDate && b.serviceDate) return a.serviceDate.getTime() - b.serviceDate.getTime();
    if (a.serviceDate) return -1;
    if (b.serviceDate) return 1;
    return a.name.localeCompare(b.name);
  });
};

export const attendanceItemToStreamingService = (
  item: AttendanceScheduleItem,
  churchId: string
): StreamingServiceInterface => {
  const tz = new Date().getTimezoneOffset();
  const serviceTime = item.serviceDate || new Date();
  return {
    churchId,
    label: item.campusName ? `${item.name} (${item.campusName})` : item.name,
    serviceTime,
    chatBefore: 600,
    chatAfter: 600,
    duration: 3600,
    earlyStart: 600,
    provider: mapAttendanceStreamProvider(item.streamType),
    providerKey: item.streamData || "",
    recurring: false,
    timezoneOffset: tz,
    videoUrl: "",
    sermonId: "latest"
  };
};

export const parsePlanningSettings = (value?: string): BranchPlanningSettings => {
  if (!value) return { services: {}, events: {} };
  try {
    const parsed = JSON.parse(value);
    return { services: parsed?.services || {}, events: parsed?.events || {} };
  } catch {
    return { services: {}, events: {} };
  }
};

export const parseLinkSettings = (value?: string): LiveStreamAttendanceLinks => {
  if (!value) return { services: {}, events: {} };
  try {
    const parsed = JSON.parse(value);
    return { services: parsed?.services || {}, events: parsed?.events || {} };
  } catch {
    return { services: {}, events: {} };
  }
};

export const getLinkedStreamingId = (
  links: LiveStreamAttendanceLinks,
  sourceType: "service" | "event",
  sourceId: string
) => (sourceType === "service" ? links.services[sourceId] : links.events[sourceId]);

export const buildLinkedIdSet = (links: LiveStreamAttendanceLinks) => {
  const result = new Set<string>();
  Object.keys(links.services).forEach((id) => result.add(`service:${id}`));
  Object.keys(links.events).forEach((id) => result.add(`event:${id}`));
  return result;
};
