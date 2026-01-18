import type { DayEvent } from "../pages/Home";

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);


export const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);


export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isValidYmd = (s: string) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export const ymdFromLocalDate = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export const addWeeksOrMonths = (ymd: string, count: number, unit: "weeks" | "months") => {
  // interpret ymd as local date at noon to avoid DST edge cases
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);

  if (unit === "weeks") {
    base.setDate(base.getDate() + count * 7);
  } else {
    base.setMonth(base.getMonth() + count);
  }
  return ymdFromLocalDate(base);
}

export const DAYSOFWEEK = [
  { key: "SU", label: "Sun" },
  { key: "MO", label: "Mon" },
  { key: "TU", label: "Tue" },
  { key: "WE", label: "Wed" },
  { key: "TH", label: "Thu" },
  { key: "FR", label: "Fri" },
  { key: "SA", label: "Sat" },
];

export const prettyDate = (d: Date) => {
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

const to12Hour = (hhmm: string) => {
  // expects "HH:mm"
  const [hhStr, mmStr] = hhmm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;

  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;

  // if you want "10am" when mm==00, change this line to omit minutes
  return `${h12}:${String(mm).padStart(2, "0")}${ampm}`;
};

export const prettyTimeRange = (e: DayEvent) => {
  if (e.all_day || (!e.start_at && !e.end_at)) return "All day";

  const s = e.start_at ? to12Hour(e.start_at) : "";
  const t = e.end_at ? to12Hour(e.end_at) : "";

  if (s && t) return `${s} - ${t}`;
  if (s) return `From ${s}`;
  if (t) return `Until ${t}`;
  return "All day";
};
