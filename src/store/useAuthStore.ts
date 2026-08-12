import { create } from "zustand";

export interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "user";
  isVerified: boolean;
  fullName: string;
}

interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOTP: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Basic client-side validation to mimic standard login errors
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }
      
      // Simulating network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock user generation
      // If email has 'admin', log in as admin, otherwise standard user
      const isAdmin = email.toLowerCase().includes("admin");
      
      const mockUser: UserProfile = {
        id: isAdmin ? "admin-123" : "user-456",
        email: email.toLowerCase(),
        role: isAdmin ? "admin" : "user",
        isVerified: isAdmin, // Admins verified by default
        fullName: isAdmin ? "Admin Manager" : "Shift Worker",
      };

      set({ user: mockUser, isLoading: false, isInitialized: true });
      return true;
    } catch (err: any) {
      set({ error: err.message || "Failed to authenticate.", isLoading: false });
      return false;
    }
  },

  loginWithOTP: async (email) => {
    set({ isLoading: true, error: null });
    try {
      if (!email) {
        throw new Error("Email is required for OTP login.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const isAdmin = email.toLowerCase().includes("admin");

      const mockUser: UserProfile = {
        id: isAdmin ? "admin-otp" : "user-otp",
        email: email.toLowerCase(),
        role: isAdmin ? "admin" : "user",
        isVerified: isAdmin,
        fullName: isAdmin ? "OTP Admin" : "OTP Worker",
      };

      set({ user: mockUser, isLoading: false, isInitialized: true });
      return true;
    } catch (err: any) {
      set({ error: err.message || "OTP request failed.", isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    set({ user: null, session: null, error: null, isLoading: false });
  },

  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setError: (error) => set({ error }),
}));
