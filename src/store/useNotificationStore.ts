import { create } from "zustand";
import {
  AppNotification,
  clearNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
} from "@/src/services/notificationService";

interface NotificationState {
  notifications: AppNotification[];
  hasUnread: boolean;
  isLoading: boolean;
  error: string | null;
  load: (userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  reset: () => void;
}

const unread = (list: AppNotification[]) => list.some((n) => !n.isRead);

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  hasUnread: false,
  isLoading: false,
  error: null,

  load: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await fetchNotifications(userId);
      set({ notifications, hasUnread: unread(notifications), isLoading: false });
    } catch (error: any) {
      set({ error: error?.message || "Failed to load notifications", isLoading: false });
    }
  },

  markAllRead: async (userId) => {
    if (!get().hasUnread) return;
    try {
      await markAllNotificationsRead(userId);
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })), hasUnread: false }));
    } catch (error: any) {
      // Read state is cosmetic; keep the list usable
      console.error("Failed to mark notifications read:", error);
    }
  },

  remove: async (id) => {
    const prev = get().notifications;
    const next = prev.filter((n) => n.id !== id);
    set({ notifications: next, hasUnread: unread(next), error: null });
    try {
      await deleteNotification(id);
    } catch (error: any) {
      set({ notifications: prev, hasUnread: unread(prev), error: error?.message || "Failed to delete notification" });
    }
  },

  clearAll: async (userId) => {
    try {
      await clearNotifications(userId);
      set({ notifications: [], hasUnread: false, error: null });
    } catch (error: any) {
      set({ error: error?.message || "Failed to clear notifications" });
      throw error;
    }
  },

  reset: () => set({ notifications: [], hasUnread: false, isLoading: false, error: null }),
}));
