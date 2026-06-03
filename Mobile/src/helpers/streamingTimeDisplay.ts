import { DateHelper } from "./DateHelper";

/** Restore true UTC after Content API `loadAll` display shift (`serviceTime - timezoneOffset`). */
export function undoApiTimezoneDisplayShift(serviceTime: Date | string, timezoneOffset?: number): Date {
  const d = new Date(Date.parse(String(serviceTime)));
  if (typeof timezoneOffset === "number") {
    d.setMinutes(d.getMinutes() + timezoneOffset);
  }
  return d;
}

/** Show schedule in the church/service timezone (e.g. CAT), not the viewer's device zone. */
export function formatStreamScheduleDisplay(date: Date, timeZone?: string) {
  if (!timeZone?.trim()) {
    return {
      date: DateHelper.prettyDate(date),
      time: DateHelper.prettyTime(date)
    };
  }
  const tz = timeZone.trim();
  return {
    date: new Intl.DateTimeFormat(undefined, { timeZone: tz, dateStyle: "medium" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { timeZone: tz, timeStyle: "short" }).format(date)
  };
}
