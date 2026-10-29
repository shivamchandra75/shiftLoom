import { create } from "zustand";
import { 
  fetchJobs, 
  fetchUserJobs, 
  applyForJob, 
  cancelJobApplication,
  fetchAdminJobs,
  cancelJobByAdmin,
  createJob,
  NewJobInput,
  fetchSavedJobs, 
  saveJob, 
  unsaveJob, 
  Job, 
  JobRole, 
  UserJob 
} from "../services/jobService";


interface JobState {
  jobList: Job[];
  adminJobList: Job[];
  userJobList: UserJob[];
  savedJobList: Job[];
  savedJobIds: string[];
  isLoading: boolean;
  isApplying: boolean;
  isCancelling: boolean;
  error: string | null;
  getJobs: (role?:JobRole['role']) => Promise<void>;
  getAdminJobs: (adminId: string) => Promise<void>;
  cancelAdminJob: (jobId: string, reason: string) => Promise<void>;
  createAdminJob: (input: NewJobInput, adminId: string) => Promise<string>;
  getUserJobs: (id: string) => Promise<void>;
  applyJob: (jobId: string, userId: string, role: string) => Promise<void>;
  cancelJob: (jobId: string, userId: string, reason: string) => Promise<void>;
  getSavedJobs: (userId: string) => Promise<void>;
  toggleSaveJob: (job: Job, userId: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobList: [],
  adminJobList: [],
  userJobList: [],
  savedJobList: [],
  savedJobIds: [],
  isLoading: false,
  isApplying: false,
  isCancelling: false,
  error: null,
  getJobs: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchJobs(role);
      set({
        jobList: data,
        isLoading: false,
      });
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to fetch jobs", isLoading: false });
    }
  },
  getAdminJobs: async (adminId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAdminJobs(adminId);
      set({ adminJobList: data, isLoading: false });
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to fetch jobs", isLoading: false });
    }
  },
  cancelAdminJob: async (jobId, reason) => {
    set({ isCancelling: true, error: null });
    try {
      await cancelJobByAdmin(jobId, reason);
      set({
        adminJobList: get().adminJobList.map(j =>
          j.id === jobId ? { ...j, status: "cancelled", cancelReason: reason } : j
        ),
        isCancelling: false,
      });
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to cancel job", isCancelling: false });
      throw error;
    }
  },
  createAdminJob: async (input, adminId) => {
    const id = await createJob(input);
    // Refetch so the new job arrives with its DB-generated id, roles and timestamps
    await get().getAdminJobs(adminId);
    return id;
  },
  getUserJobs: async (userId) => {
    set({ isLoading: true, error: null });
    try{
      const data = await fetchUserJobs(userId);
      set({
        userJobList: data,
        isLoading: false,
      })
    }catch(error: any){
      console.error(error);
      set({error: error?.message || "Failed to fetch user jobs", isLoading: false})
    }
  },
  applyJob: async (jobId, userId, role) => {
    set({ isApplying: true, error: null });
    try {
      await applyForJob(jobId, userId, role);
      // Refresh the user's job list after applying so it stays in sync
      await get().getUserJobs(userId);
      set({ isApplying: false });
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to apply for job", isApplying: false });
      throw error; // Re-throw so the UI can catch it and show an alert
    }
  },
  cancelJob: async (jobId, userId, reason) => {
    set({ isCancelling: true, error: null });
    try {
      await cancelJobApplication(jobId, userId, reason);
      await get().getUserJobs(userId);
      set({ isCancelling: false });
      console.log("❌ cancelled this job with reason:", reason);
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to cancel shift", isCancelling: false });
      throw error;
    }
  },
  getSavedJobs: async (userId) => {
    try {
      const data = await fetchSavedJobs(userId);
      set({
        savedJobList: data,
        savedJobIds: data.map(j => j.id),
      });
    } catch (error: any) {
      console.error(error);
      set({ error: error?.message || "Failed to fetch saved jobs" });
    }
  },
  toggleSaveJob: async (job, userId) => {
    const { savedJobIds, savedJobList } = get();
    const isCurrentlySaved = savedJobIds.includes(job.id);

    if (isCurrentlySaved) {
      set({
        savedJobIds: savedJobIds.filter(id => id !== job.id),
        savedJobList: savedJobList.filter(j => j.id !== job.id),
      });
    } else {
      set({
        savedJobIds: [...savedJobIds, job.id],
        savedJobList: [job, ...savedJobList],
      });
    }

    try {
      if (isCurrentlySaved) {
        await unsaveJob(job.id, userId);
      } else {
        await saveJob(job.id, userId);
      }
    } catch (error: any) {
      console.error("Failed to toggle save job:", error);
      // Rollback on failure
      set({ savedJobIds, savedJobList });
      throw error;
    }
  }
}));
