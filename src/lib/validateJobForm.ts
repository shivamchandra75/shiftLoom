import type { JobRole } from "@/src/services/jobService";
import { toYmd } from "@/src/lib/utils";

export interface RoleRow {
  key: string;
  role: JobRole["role"] | "";
  slots: string;
  wage: string;
}

export interface JobFormValues {
  companyName: string;
  locationAddress: string;
  coords: { latitude: number; longitude: number } | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  roles: RoleRow[];
}

// Keys: field name, or `role.<key>.role|slots|wage` for role rows
export type JobFormErrors = Record<string, string>;

// Rough bounding box of India (incl. Andaman & Nicobar and Lakshadweep)
export const isInIndia = (c: { latitude: number; longitude: number }) =>
  c.latitude >= 6 && c.latitude <= 37.5 && c.longitude >= 68 && c.longitude <= 97.5;

// Accepts "19.0760, 72.8777" (comma and/or spaces); returns null if not two valid numbers
export function parseCoords(text: string): { latitude: number; longitude: number } | null {
  const parts = text.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const [latitude, longitude] = parts.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

const isPositiveInt = (v: string) => /^\d+$/.test(v.trim()) && Number(v) >= 1;

export function validateJobForm(v: JobFormValues, today = toYmd(new Date())): JobFormErrors {
  const errors: JobFormErrors = {};

  if (!v.companyName.trim()) errors.companyName = "Company name is required";
  if (!v.locationAddress.trim()) errors.locationAddress = "Address is required";
  if (!v.coords) errors.coords = "Pin the location: search, paste coordinates or tap the map";
  else if (!isInIndia(v.coords)) errors.coords = "Location must be in India";

  if (!v.date) errors.date = "Pick a date";
  else if (v.date < today) errors.date = "Date can't be in the past";

  if (!v.startTime) errors.startTime = "Pick a start time";
  if (!v.endTime) errors.endTime = "Pick an end time";
  // shortcut: overnight shifts (end past midnight) are rejected, allow them if needed
  else if (v.startTime && v.endTime <= v.startTime) errors.endTime = "End time must be after start time";

  if (v.roles.length === 0) errors.roles = "Add at least one role";
  const seen = new Set<string>();
  for (const r of v.roles) {
    if (!r.role) errors[`role.${r.key}.role`] = "Pick a role";
    else if (seen.has(r.role)) errors[`role.${r.key}.role`] = "Role already added";
    else seen.add(r.role);

    if (!isPositiveInt(r.slots)) errors[`role.${r.key}.slots`] = "Whole number, 1 or more";
    if (!(Number(r.wage) > 0)) errors[`role.${r.key}.wage`] = "Enter a wage above ₹0";
  }

  return errors;
}

export type JobFormStep = 1 | 2 | 3;

const STEP_OF = (key: string): JobFormStep =>
  ["companyName", "locationAddress", "coords"].includes(key) ? 1 : ["date", "startTime", "endTime"].includes(key) ? 2 : 3;

// Only the errors that belong to one step of the post-job wizard
export const errorsForStep = (errors: JobFormErrors, step: JobFormStep): JobFormErrors =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => STEP_OF(key) === step));
