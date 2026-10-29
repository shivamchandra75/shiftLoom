import type { Job, JobRole } from "@/src/services/jobService";
import { parseYmd } from "@/src/lib/utils";

// Search, filter and sort run on the job list already loaded on the device.

export type DateFilter = "today" | "tomorrow" | "week" | "weekend";
export type TimeFilter = "morning" | "afternoon" | "evening" | "night";
export type SortKey = "saved" | "date-asc" | "date-desc" | "pay-desc";

export interface ShiftFilters {
  dates: DateFilter[];
  minPay: number;
  times: TimeFilter[];
}

export const NO_FILTERS: ShiftFilters = { dates: [], minPay: 0, times: [] };

export const filterCount = (f: ShiftFilters) => f.dates.length + (f.minPay ? 1 : 0) + f.times.length;

// Wage shown to this worker: their role's wage, else the first role's
export const roleWage = (job: Job, role?: string | null) =>
  job.jobRoles.find((r: JobRole) => r.role === role)?.wageInr ?? job.jobRoles[0]?.wageInr ?? 0;

export function matchesSearch(job: Job, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || job.companyName.toLowerCase().includes(q) || job.locationAddress.toLowerCase().includes(q);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function matchesDate(ymd: string, f: DateFilter, now: Date): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = parseYmd(ymd);
  const days = Math.round((date.getTime() - today.getTime()) / DAY_MS);
  if (f === "today") return days === 0;
  if (f === "tomorrow") return days === 1;
  if (f === "week") return days >= 0 && days <= 6;
  return days >= 0 && days <= 6 && (date.getDay() === 0 || date.getDay() === 6); // the coming weekend
}

function matchesTime(startTime: string, f: TimeFilter): boolean {
  const hour = Number(startTime.split(":")[0]);
  if (f === "morning") return hour >= 5 && hour < 12;
  if (f === "afternoon") return hour >= 12 && hour < 17;
  if (f === "evening") return hour >= 17 && hour < 21;
  return hour >= 21 || hour < 5;
}

// Options inside a group are OR-ed; groups are AND-ed.
export function matchesFilters(job: Job, f: ShiftFilters, wage: number, now = new Date()): boolean {
  if (f.dates.length && !f.dates.some((d) => matchesDate(job.date, d, now))) return false;
  if (f.minPay && wage < f.minPay) return false;
  if (f.times.length && !f.times.some((t) => matchesTime(job.startTime, t))) return false;
  return true;
}

// "saved" keeps the incoming order (most recently saved first).
export function sortJobs<T>(items: T[], key: SortKey, get: (item: T) => { date: string; startTime: string; wage: number }): T[] {
  if (key === "saved") return items;
  const when = (t: T) => `${get(t).date} ${get(t).startTime}`;
  const sorted = [...items];
  if (key === "pay-desc") return sorted.sort((a, b) => get(b).wage - get(a).wage);
  sorted.sort((a, b) => when(a).localeCompare(when(b)));
  return key === "date-desc" ? sorted.reverse() : sorted;
}

export const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This week", value: "week" },
  { label: "Weekend", value: "weekend" },
];
export const PAY_FILTERS = [
  { label: "Any", value: 0 },
  { label: "₹800+", value: 800 },
  { label: "₹1,000+", value: 1000 },
  { label: "₹1,500+", value: 1500 },
];
export const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" },
];
export const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Shift date, soonest first", value: "date-asc" },
  { label: "Shift date, latest first", value: "date-desc" },
  { label: "Pay, highest first", value: "pay-desc" },
];
export const sortLabel = (key: SortKey) => (key === "pay-desc" ? "Pay" : key === "saved" ? "Recently saved" : "Shift date");
