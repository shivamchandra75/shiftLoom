import { supabase } from "../lib/supabase";

export interface UserJob {
  applicationId: string;
  status: string;
  role: string;
  cancelReason?: string | null;
  job: Job;
}

export interface JobRole {
  id: string;
  jobId: string;
  role: "driver" | "steward" | "chef";
  totalSlots: number;
  wageInr: number;
}

export interface Job {
  id: string;
  companyName: string;
  locationAddress: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  startTime: string;
  endTime: string;
  status: "open" | "closed" | "completed" | "cancelled" | null;
  cancelReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  jobRoles: JobRole[];
  /** Accepted workers. Only present when the query joined user_jobs (admin lists). */
  filledSlots?: number;
}

export function formatDbJob(dbJob: any): Job {
  if (!dbJob) {
    return {
      id: "",
      companyName: "Unknown Company",
      locationAddress: "Location unavailable",
      latitude: null,
      longitude: null,
      date: "",
      startTime: "",
      endTime: "",
      status: null,
      cancelReason: null,
      createdBy: null,
      createdAt: "",
      updatedAt: "",
      jobRoles: [],
    };
  }

  return {
    id: dbJob.id || "",
    companyName: dbJob.company_name || "Unknown Company",
    locationAddress: dbJob.location_address || "Location unavailable",
    latitude: dbJob.latitude ?? null,
    longitude: dbJob.longitude ?? null,
    date: dbJob.job_date || "",
    startTime: dbJob.start_time || "",
    endTime: dbJob.end_time || "",
    status: dbJob.status || null,
    cancelReason: dbJob.cancel_reason ?? null,
    createdBy: dbJob.created_by ?? null,
    createdAt: dbJob.created_at || "",
    updatedAt: dbJob.updated_at || "",
    jobRoles: Array.isArray(dbJob.job_roles)
      ? dbJob.job_roles.map((role: any): JobRole => ({
          id: role.id,
          jobId: role.job_id,
          role: role.role,
          totalSlots: role.total_slots,
          wageInr: Number(role.wage_inr || 0),
        }))
      : [],
    filledSlots: Array.isArray(dbJob.user_jobs) ? dbJob.user_jobs.filter((u: any) => u.status === "accepted").length : undefined,
  };
}

export async function fetchJobs(role?: JobRole['role']): Promise<Job[]> {
  const selectQuery = role ? "*, job_roles!inner(*)" : "*, job_roles(*)";
  let query = supabase
    .from("jobs")
    .select(selectQuery)
    .order("job_date", { ascending: true });

  if (role) {
    query = query.eq("job_roles.role", role);
  }
  const { data, error } = await query;

  if (error) {
    throw error;
  }
  if (!data) return [];

  return data.map(formatDbJob);
}

export async function fetchUserJobs(currentUserId: string): Promise<UserJob[]>{
  const { data, error } = await supabase
    .from("user_jobs")
    .select(`
      id,
      status,
      role,
      cancel_reason,
      jobs (*, job_roles (*))
    `)
    .eq("user_id", currentUserId);
    // .neq("status", "cancelled_by_user"); // Example: don't show jobs they cancelled

  if(error) throw error;

  if(!data) return [];

  return data
    .filter((row: any) => row.jobs)
    .map((row: any) => ({
      applicationId: row.id,
      status: row.status,
      role: row.role,
      cancelReason: row.cancel_reason ?? null,
      job: formatDbJob(row.jobs)
    }));
}

export async function applyForJob(jobId: string, userId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from("user_jobs")
    .insert({
      job_id: jobId,
      user_id: userId,
      role: role,
      status: "accepted"
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error("You have already applied for this shift.");
    }
    throw error;
  }
}

export async function fetchSavedJobs(userId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`
      id,
      jobs (*, job_roles (*))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((row: any) => row.jobs)
    .map((row: any) => formatDbJob(row.jobs));
}

export async function saveJob(jobId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_jobs")
    .insert({
      job_id: jobId,
      user_id: userId,
    });

  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function unsaveJob(jobId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("job_id", jobId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function cancelJobApplication(jobId: string, userId: string, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_jobs")
    .update({ 
      status: "cancelled_by_user",
      cancel_reason: reason 
    })
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Failed to cancel: no matching shift application found or RLS policy blocked the update.");
  }
}


export interface JobAssignment {
  applicationId: string;
  role: JobRole['role'];
  userId: string;
  name: string;
  email: string;
}

export async function fetchAdminJobs(adminId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, job_roles(*), user_jobs(status)")
    .eq("created_by", adminId);

  if (error) throw error;
  return (data ?? []).map(formatDbJob);
}

export async function fetchJobAssignments(jobId: string): Promise<JobAssignment[]> {
  const { data, error } = await supabase
    .from("user_jobs")
    .select("id, role, users(id, first_name, last_name, email)")
    .eq("job_id", jobId)
    .eq("status", "accepted");

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    applicationId: row.id,
    role: row.role,
    userId: row.users?.id ?? "",
    name: `${row.users?.first_name ?? ""} ${row.users?.last_name ?? ""}`.trim() || "Unknown worker",
    email: row.users?.email ?? "",
  }));
}

export async function cancelJobByAdmin(jobId: string, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "cancelled", cancel_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .in("status", ["open", "closed"])
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Failed to cancel: job is not open/closed or RLS policy blocked the update.");
  }
}

export interface NewJobInput {
  companyName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  roles: { role: JobRole['role']; totalSlots: number; wageInr: number }[];
}

// Uses the create_job RPC so the job and its roles are inserted in one transaction.
export async function createJob(input: NewJobInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_job", {
    p_job: {
      company_name: input.companyName,
      location_address: input.locationAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      job_date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
    },
    p_roles: input.roles.map((r) => ({ role: r.role, total_slots: r.totalSlots, wage_inr: r.wageInr })),
  });

  if (error) throw error;
  return data as string;
}

export interface CompanySuggestion {
  name: string;
  shifts: number;
}

// Distinct company names from past jobs with how many shifts each has, for the post-job autocomplete
export async function searchCompanies(query: string, signal: AbortSignal): Promise<CompanySuggestion[]> {
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { data, error } = await supabase
    .from("jobs")
    .select("company_name")
    .ilike("company_name", pattern)
    .order("created_at", { ascending: false })
    .limit(100)
    .abortSignal(signal);

  if (error) throw error;
  const byName = new Map<string, CompanySuggestion>();
  for (const row of data ?? []) {
    const name = String(row.company_name).trim();
    const hit = byName.get(name.toLowerCase());
    if (hit) hit.shifts += 1;
    else if (name) byName.set(name.toLowerCase(), { name, shifts: 1 });
  }
  return [...byName.values()].slice(0, 5);
}
