import { supabase } from "../lib/supabase";

export interface UserJob {
  applicationId: string;
  status: string;
  role: string;
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
}

export function formatDbJob(dbJob: any): Job {
  return {
    id: dbJob.id,
    companyName: dbJob.company_name,
    locationAddress: dbJob.location_address,
    latitude: dbJob.latitude ?? null,
    longitude: dbJob.longitude ?? null,
    date: dbJob.job_date,
    startTime: dbJob.start_time,
    endTime: dbJob.end_time,
    status: dbJob.status,
    cancelReason: dbJob.cancel_reason ?? null,
    createdBy: dbJob.created_by ?? null,
    createdAt: dbJob.created_at,
    updatedAt: dbJob.updated_at,
    jobRoles: (dbJob.job_roles || []).map((role: any): JobRole => ({
      id: role.id,
      jobId: role.job_id,
      role: role.role,
      totalSlots: role.total_slots,
      wageInr: Number(role.wage_inr),
    })),
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
      jobs (*, job_roles (*))
    `)
    .eq("user_id", currentUserId);
    // .neq("status", "cancelled_by_user"); // Example: don't show jobs they cancelled

  if(error) throw error;

  if(!data) return [];

  return data.map((row: any) => ({
    applicationId: row.id,
    status: row.status,
    role: row.role,
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
