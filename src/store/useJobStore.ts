import { create } from "zustand";
import { fetchJobs, fetchUserJobs, applyForJob, Job, JobRole, UserJob } from "../services/jobService";


interface JobState {
  jobList: Job[];
  userJobList: UserJob[];
  isLoading: boolean;
  isApplying: boolean;
  error: string | null;
  getJobs: (role?:JobRole['role']) => Promise<void>;
  getUserJobs: (id: string) => Promise<void>;
  applyJob: (jobId: string, userId: string, role: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobList: [],
  userJobList: [],
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
  }
}));
