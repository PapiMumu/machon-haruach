import { ApiHelper } from "@machonharuach/helpers";

import { undoApiTimezoneDisplayShift } from "./streamingTimeDisplay";
import type { PreviewStreamingService, StreamingPreviewConfig } from "./streamingSchedule";

export interface ChurchStreamLookup {
  id?: string;
  subDomain?: string;
}

async function resolveSubDomain(church: ChurchStreamLookup): Promise<string> {
  const direct = church.subDomain?.trim();
  if (direct) return direct;
  if (!church.id) return "";
  try {
    const lookup = await ApiHelper.getAnonymous("/churches/lookup/?id=" + church.id, "MembershipApi");
    return String(lookup?.subDomain || "").trim();
  } catch {
    return "";
  }
}

function mapAuthServiceToPreview(service: Record<string, unknown>): PreviewStreamingService {
  const timezoneOffset = typeof service.timezoneOffset === "number" ? service.timezoneOffset : undefined;
  const rawTime = service.serviceTime as string | Date;
  return {
    id: service.id as string | undefined,
    label: service.label as string | undefined,
    serviceTime: undoApiTimezoneDisplayShift(rawTime, timezoneOffset),
    earlyStart: service.earlyStart as PreviewStreamingService["earlyStart"],
    chatBefore: service.chatBefore as PreviewStreamingService["chatBefore"],
    chatAfter: service.chatAfter as PreviewStreamingService["chatAfter"],
    provider: service.provider as string | undefined,
    providerKey: service.providerKey as string | undefined,
    videoUrl: service.videoUrl as string | undefined,
    recurring: Boolean(service.recurring),
    timezoneOffset,
    timeZone: typeof service.timeZone === "string" ? service.timeZone : undefined
  };
}

/**
 * Load streaming schedule for Media — preview by subdomain, with authenticated API fallback.
 * Fixes missing stream UI when subdomain is absent on the church record or preview cache is stale.
 */
export async function fetchStreamingPreviewConfig(church: ChurchStreamLookup): Promise<StreamingPreviewConfig> {
  /** Same source as Admin after save — includes recurring roll-forward and timezone-adjusted times. */
  if (ApiHelper.isAuthenticated) {
    try {
      const services = await ApiHelper.get("/streamingServices", "ContentApi");
      if (Array.isArray(services) && services.length > 0) {
        return {
          churchId: church.id,
          services: services.map((s) => mapAuthServiceToPreview(s as Record<string, unknown>))
        };
      }
    } catch (error) {
      console.warn("[fetchStreamingPreview] /streamingServices failed:", error);
    }
  }

  if (church.id) {
    try {
      const preview = (await ApiHelper.getAnonymous(
        "/preview/church/" + encodeURIComponent(church.id),
        "ContentApi"
      )) as StreamingPreviewConfig;
      if (Array.isArray(preview?.services) && preview.services.length > 0) {
        return preview;
      }
    } catch (error) {
      console.warn("[fetchStreamingPreview] preview/church failed:", error);
    }
  }

  const subDomain = await resolveSubDomain(church);
  if (subDomain) {
    try {
      const preview = (await ApiHelper.getAnonymous(
        "/preview/data/" + encodeURIComponent(subDomain),
        "ContentApi"
      )) as StreamingPreviewConfig;
      if (Array.isArray(preview?.services) && preview.services.length > 0) {
        return preview;
      }
    } catch (error) {
      console.warn("[fetchStreamingPreview] preview/data failed:", error);
    }
  }

  return { services: [] };
}
