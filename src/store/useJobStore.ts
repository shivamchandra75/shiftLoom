import { create } from "zustand";
import { 
  fetchJobs, 
  fetchUserJobs, 
  applyForJob, 
  fetchSavedJobs, 
  saveJob, 
  unsaveJob, 
  Job, 
  JobRole, 
  UserJob 
} from "../services/jobService";


interface JobState {
  jobList: Job[];
  userJobList: UserJob[];
  savedJobList: Job[];
  savedJobIds: string[];
  isLoading: boolean;
  isApplying: boolean;
  error: string | null;
  getJobs: (role?:JobRole['role']) => Promise<void>;
  getUserJobs: (id: string) => Promise<void>;
  applyJob: (jobId: string, userId: string, role: string) => Promise<void>;
  getSavedJobs: (userId: string) => Promise<void>;
  toggleSaveJob: (job: Job, userId: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobList: [],
  userJobList: [],
  savedJobList: [],
  savedJobIds: [],
  isLoading: false,
  isApplying: false,
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
