import { ApiHelper } from "@machonharuach/apphelper";
import type { GenericSettingInterface } from "@machonharuach/helpers";
import {
  LIVE_STREAM_ATTENDANCE_LINKS_KEY,
  parseLinkSettings,
  type LiveStreamAttendanceLinks
} from "./attendanceSchedule";

export const loadAttendanceStreamLinks = async (): Promise<{
  links: LiveStreamAttendanceLinks;
  setting: GenericSettingInterface | null;
}> => {
  const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
  const setting = allSettings.find((s) => s.keyName === LIVE_STREAM_ATTENDANCE_LINKS_KEY) || null;
  return { links: parseLinkSettings(setting?.value), setting };
};

export const saveAttendanceStreamLink = async (
  sourceType: "service" | "event",
  sourceId: string,
  streamingServiceId: string,
  churchId: string,
  existingSetting: GenericSettingInterface | null,
  existingLinks: LiveStreamAttendanceLinks
) => {
  const links = {
    services: { ...existingLinks.services },
    events: { ...existingLinks.events }
  };
  if (sourceType === "service") links.services[sourceId] = streamingServiceId;
  else links.events[sourceId] = streamingServiceId;

  const setting: GenericSettingInterface = existingSetting || {
    keyName: LIVE_STREAM_ATTENDANCE_LINKS_KEY,
    public: 0,
    churchId
  };
  setting.churchId = churchId;
  setting.value = JSON.stringify(links);
  await ApiHelper.post("/settings", [setting], "MembershipApi");
};

export const removeAttendanceStreamLink = async (
  sourceType: "service" | "event",
  sourceId: string,
  churchId: string,
  existingSetting: GenericSettingInterface | null,
  existingLinks: LiveStreamAttendanceLinks
) => {
  const links = {
    services: { ...existingLinks.services },
    events: { ...existingLinks.events }
  };
  if (sourceType === "service") delete links.services[sourceId];
  else delete links.events[sourceId];

  const setting: GenericSettingInterface = existingSetting || {
    keyName: LIVE_STREAM_ATTENDANCE_LINKS_KEY,
    public: 0,
    churchId
  };
  setting.churchId = churchId;
  setting.value = JSON.stringify(links);
  await ApiHelper.post("/settings", [setting], "MembershipApi");
};

export const removeLinksForStreamingService = async (
  streamingServiceId: string,
  churchId: string,
  existingSetting: GenericSettingInterface | null,
  existingLinks: LiveStreamAttendanceLinks
) => {
  const links = {
    services: { ...existingLinks.services },
    events: { ...existingLinks.events }
  };
  Object.keys(links.services).forEach((key) => {
    if (links.services[key] === streamingServiceId) delete links.services[key];
  });
  Object.keys(links.events).forEach((key) => {
    if (links.events[key] === streamingServiceId) delete links.events[key];
  });

  const setting: GenericSettingInterface = existingSetting || {
    keyName: LIVE_STREAM_ATTENDANCE_LINKS_KEY,
    public: 0,
    churchId
  };
  setting.churchId = churchId;
  setting.value = JSON.stringify(links);
  await ApiHelper.post("/settings", [setting], "MembershipApi");
};
