export interface PreviewStreamingService {
  id?: string;
  label?: string;
  serviceTime: string | Date;
  earlyStart: string;
  chatBefore: string;
  chatAfter: string;
  timezoneOffset?: number;
  /** IANA zone from admin (e.g. Africa/Harare) — used for display in church local time */
  timeZone?: string;
  recurring?: boolean;
  videoUrl?: string;
  provider?: string;
  providerKey?: string;
  sermon?: { duration?: number; title?: string; videoUrl?: string };
  localCountdownTime?: Date;
  localStartTime?: Date;
  localEndTime?: Date;
  localChatStart?: Date;
  localChatEnd?: Date;
}

export interface StreamingPreviewConfig {
  services?: PreviewStreamingService[];
}

/** earlyStart / chatBefore / chatAfter may be seconds (number) or "m:ss" (string) from the API. */
const parseDurationSeconds = (value?: string | number | null) => {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value).trim();
  if (!str) return 0;
  if (str.includes(":")) {
    const [minPart, secPart] = str.split(":");
    const min = parseInt(minPart, 10) || 0;
    const sec = parseInt(secPart, 10) || 0;
    return min * 60 + sec;
  }
  const n = parseInt(str, 10);
  return Number.isFinite(n) ? n : 0;
};

/** Parse API dates — matches B1 web (no timezoneOffset adjustment on preview data). */
export const normalizePreviewServices = (services: PreviewStreamingService[]) => {
  return services.map((service) => {
    const s = { ...service };
    s.serviceTime = new Date(Date.parse(s.serviceTime.toString()));
    return s;
  });
};

/** Roll recurring services forward so the next occurrence is in the future (matches Content API loadAll). */
export const advanceRecurringPreviewServices = (services: PreviewStreamingService[]) => {
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
  for (const s of services) {
    if (!s.recurring) continue;
    const serviceTime = new Date(s.serviceTime);
    while (serviceTime.getTime() < sixHoursAgo) {
      serviceTime.setDate(serviceTime.getDate() + 7);
    }
    s.serviceTime = serviceTime;
  }
};

export const updateStreamingServiceTimes = (services: PreviewStreamingService[]) => {
  for (const s of services) {
    s.localCountdownTime = new Date(new Date(s.serviceTime).getTime());
    s.localStartTime = new Date(s.localCountdownTime.getTime());
    s.localStartTime.setSeconds(s.localStartTime.getSeconds() - parseDurationSeconds(s.earlyStart));
    s.localEndTime = new Date(s.localStartTime.getTime());
    s.localEndTime.setSeconds(s.localEndTime.getSeconds() + parseDurationSeconds(s.sermon?.duration ?? 5400));
    s.localChatStart = new Date(s.localStartTime.getTime());
    s.localChatStart.setSeconds(s.localChatStart.getSeconds() - parseDurationSeconds(s.chatBefore));
    s.localChatEnd = new Date(s.localEndTime.getTime());
    s.localChatEnd.setSeconds(s.localChatEnd.getSeconds() + parseDurationSeconds(s.chatAfter));
  }
};

export const determineCurrentStreamingService = (
  services: PreviewStreamingService[],
  now = new Date()
) => {
  let result: PreviewStreamingService | null = null;
  for (const s of services) {
    if (s.localChatEnd && s.localEndTime && now <= s.localChatEnd) {
      if (!result || (result.localEndTime && s.localEndTime < result.localEndTime)) {
        result = s;
      }
    }
  }
  return result;
};

export const getNextStreamingService = (services: PreviewStreamingService[]) => {
  const now = new Date();
  const upcoming = services
    .filter((s) => s.localCountdownTime && s.localCountdownTime > now)
    .sort((a, b) => a.localCountdownTime!.getTime() - b.localCountdownTime!.getTime());
  return upcoming[0] || null;
};

/** Service in the live video window (matches B1 web: after early start, through sermon end). */
export const getLiveStreamingService = (services: PreviewStreamingService[], now = new Date()) => {
  for (const s of services) {
    if (isBroadcastVideoActive(s, now)) return s;
  }
  return null;
};

/** Closest scheduled service for UI (never null when `services` is non-empty). */
export const getNearestStreamingService = (services: PreviewStreamingService[], now = new Date()) => {
  let best: PreviewStreamingService | null = null;
  let bestDiff = Infinity;
  for (const s of services) {
    if (!s.localCountdownTime) continue;
    const diff = Math.abs(s.localCountdownTime.getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
};

/** Primary service for Media UI — live, in chat window, upcoming, or nearest. */
export const getPrimaryStreamingService = (
  services: PreviewStreamingService[],
  now = new Date()
) => {
  const live = getLiveStreamingService(services, now);
  if (live) return live;
  const active = determineCurrentStreamingService(services, now);
  if (active) return active;
  const next = getNextStreamingService(services);
  if (next) return next;
  return getNearestStreamingService(services, now);
};

/** @deprecated Use getPrimaryStreamingService */
export const getDisplayStreamingService = getPrimaryStreamingService;

/** Show the stream block whenever the church has streaming configured. */
export const shouldShowStreamOnMedia = (services: PreviewStreamingService[]) => services.length > 0;

export const isServiceLiveNow = (service: PreviewStreamingService | null, now = new Date()) => {
  return isBroadcastVideoActive(service, now);
};

/** True when the sermon/video should play (B1 web stream page logic). */
export const isBroadcastVideoActive = (service: PreviewStreamingService | null, now = new Date()) => {
  if (!service?.localEndTime) return false;
  const videoStart = service.localStartTime ?? service.localCountdownTime;
  if (!videoStart) return false;
  return now.getTime() >= videoStart.getTime() && now.getTime() <= service.localEndTime.getTime();
};

/** Show in-app live player when video window is active, or countdown just reached zero. */
export const shouldShowLivePlayer = (
  service: PreviewStreamingService | null,
  now: Date,
  countdownExpired: boolean
) => {
  if (!service) return false;
  if (isBroadcastVideoActive(service, now)) return true;
  if (!countdownExpired) return false;
  const videoStart = service.localStartTime ?? service.localCountdownTime;
  if (!videoStart) return false;
  return now.getTime() >= videoStart.getTime() && now.getTime() <= (service.localChatEnd ?? service.localEndTime)!.getTime();
};

export const shouldShowStreamCountdown = (service: PreviewStreamingService | null, isLive: boolean, now = new Date()) => {
  if (isLive) return true;
  if (!service?.localCountdownTime) return false;
  const hours = (service.localCountdownTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hours <= 24 && hours > 0;
};

const youTubeVideoIdFromKey = (key: string) => {
  let result = key.split("&")[0];
  result = result
    .replace("https://www.youtube.com/watch?v=", "")
    .replace("https://youtube.com/watch?v=", "")
    .replace("https://youtu.be/", "")
    .replace("https://www.youtube.com/embed/", "")
    .replace("https://studio.youtube.com/video/", "")
    .replace("/edit", "");
  return result;
};

/** Embed URL for in-app playback (matches B1 web stream + Admin ServiceEdit). */
export const getStreamingEmbedUrl = (service: PreviewStreamingService | null): string | null => {
  if (!service) return null;

  const serviceVideo = service.videoUrl?.trim();
  if (serviceVideo) return serviceVideo;

  const sermonVideo = service.sermon?.videoUrl?.trim();
  if (sermonVideo) return sermonVideo;

  const rawKey = service.providerKey?.trim();
  if (!rawKey) return null;

  if (/^https?:\/\//i.test(rawKey)) {
    if (rawKey.includes("youtube.com/embed") || rawKey.includes("player.vimeo.com") || rawKey.includes("facebook.com/plugins")) {
      return rawKey;
    }
    const inferredId = youTubeVideoIdFromKey(rawKey);
    if (inferredId && inferredId.length < 64) {
      return `https://www.youtube.com/embed/${inferredId}?autoplay=1&controls=1&showinfo=0&rel=0&modestbranding=1`;
    }
  }

  switch (service.provider) {
    case "youtube_live":
    case "youtube_watchparty": {
      const id = youTubeVideoIdFromKey(rawKey);
      return `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&showinfo=0&rel=0&modestbranding=1`;
    }
    case "vimeo_live":
    case "vimeo_watchparty": {
      const id = rawKey.replace("https://vimeo.com/", "").replace("https://player.vimeo.com/video/", "");
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    case "facebook_live": {
      const id = rawKey.replace("https://facebook.com/video.php?v=", "");
      return `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D${id}&show_text=0&autoplay=1&allowFullScreen=1`;
    }
    default:
      return null;
  }
};

export const hasStreamingSchedule = (services: PreviewStreamingService[]) => services.length > 0;
