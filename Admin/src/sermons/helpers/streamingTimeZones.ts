/** Common IANA zones for churches (label includes standard abbreviation where helpful). */
export const STREAMING_TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Africa/Harare", label: "Central Africa — Harare (CAT, UTC+2)" },
  { value: "Africa/Johannesburg", label: "South Africa — Johannesburg (SAST, UTC+2)" },
  { value: "Africa/Lagos", label: "West Africa — Lagos (WAT, UTC+1)" },
  { value: "Africa/Nairobi", label: "East Africa — Nairobi (EAT, UTC+3)" },
  { value: "Africa/Cairo", label: "Egypt — Cairo (EET, UTC+2)" },
  { value: "Europe/London", label: "UK — London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe — Paris (CET/CEST)" },
  { value: "America/New_York", label: "US Eastern — New York (ET)" },
  { value: "America/Chicago", label: "US Central — Chicago (CT)" },
  { value: "America/Denver", label: "US Mountain — Denver (MT)" },
  { value: "America/Los_Angeles", label: "US Pacific — Los Angeles (PT)" },
  { value: "America/Sao_Paulo", label: "Brazil — São Paulo (BRT)" },
  { value: "Asia/Dubai", label: "Gulf — Dubai (GST, UTC+4)" },
  { value: "Asia/Kolkata", label: "India — Kolkata (IST, UTC+5:30)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Australia/Sydney", label: "Australia — Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "New Zealand — Auckland (NZST/NZDT)" }
];

export const DEFAULT_STREAMING_TIME_ZONE = "Africa/Harare";

/** Offset in ms for `timeZone` at a given UTC instant (positive = zone ahead of UTC). */
export function getTimeZoneOffsetMs(timeZone: string, utcDate: Date): number {
  const utc = utcDate.getTime();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(utcDate);
  const pick = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
  return asUtc - utc;
}

/** `datetime-local` value is wall time in `timeZone`; return UTC Date for API storage. */
export function wallDateTimeLocalToUtc(isoLocal: string, timeZone: string): Date {
  const [datePart, timePart = "00:00"] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute, 0);
  const offsetMs = getTimeZoneOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offsetMs);
}

/** UTC instant → `datetime-local` string in `timeZone` for form inputs. */
export function utcToWallDateTimeLocal(utcDate: Date | string, timeZone: string): string {
  const date = new Date(utcDate);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

/** Legacy: Content API subtracts `timezoneOffset` on load for admin; restore true UTC. */
export function undoApiTimezoneDisplayShift(serviceTime: Date | string, timezoneOffset?: number): Date {
  const d = new Date(Date.parse(String(serviceTime)));
  if (typeof timezoneOffset === "number") {
    d.setMinutes(d.getMinutes() + timezoneOffset);
  }
  return d;
}
