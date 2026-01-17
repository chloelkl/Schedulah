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