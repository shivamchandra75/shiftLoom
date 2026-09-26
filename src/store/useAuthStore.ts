import { create } from "zustand";
import { supabase } from "@/src/lib/supabase";
import { fetchUser, UpdateProfileInput, updateUser, User } from "@/src/services/userService";

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  loginWithOTP: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Check current active session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session?.user) {
        const dbUser = await fetchUser(session.user.id);
        set({
          user: dbUser || {
            id: session.user.id,
            email: session.user.email || "",
            role: null,
            isVerified: false,
            firstName: "",
            lastName: "",
          },
        });
      }

      // 2. Listen to real-time auth state events
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session });
        if (session?.user) {
          try {
            const dbUser = await fetchUser(session.user.id);
            set({
              user: dbUser || {
                id: session.user.id,
                email: session.user.email || "",
                role: null,
                isVerified: false,
                firstName: "",
                lastName: "",
              },
            });
          } catch (err) {
            console.error("Error fetching user profile on auth change:", err);
          }
        } else {
          set({ user: null });
        }
      });

      set({ isInitialized: true });
    } catch (err: any) {
      console.error("Error during Supabase auth initialization:", err);
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const dbUser = await fetchUser(data.user.id);
        set({
          user: dbUser || {
            id: data.user.id,
            email: data.user.email || "",
            role: null,
            isVerified: false,
            firstName: "",
            lastName: "",
          },
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to authenticate.", isLoading: false });
      return false;
    }
  },

  updateUserProfile: async (updates:UpdateProfileInput) => {
    const currentUser = get().user;

    console.log('step 1');
    if (!currentUser?.id) {
      set({ error: "No user is logged in" });
      return false;
    }
    console.log('user id: ', currentUser?.id);

    set({ isLoading: true, error: null });

    try{
      console.log('loading');
      await updateUser(currentUser.id, updates);

      console.log('sent to supabase success');

      const dbUser = await fetchUser(currentUser.id);
      console.log('fetching user', dbUser);
      set({user: dbUser, isLoading: false});
      return true;
    } catch (err: any) {
      set({ error: err.message || "Failed to create account.", isLoading: false });
      return false;
    }

  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const dbUser = await fetchUser(data.user.id);
        set({
          user: dbUser || {
            id: data.user.id,
            email: data.user.email || "",
            role: null,
            isVerified: false,
            firstName: "",
            lastName: "",
          },
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to create account.", isLoading: false });
      return false;
    }
  },

  loginWithOTP: async (email) => {
    set({ isLoading: true, error: null });
    try {
      if (!email) {
        throw new Error("Email is required for OTP login.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || "OTP request failed.", isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, error: null, isLoading: false });
    } catch (err: any) {
      console.error("Logout failed:", err);
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
}));
