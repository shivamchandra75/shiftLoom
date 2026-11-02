import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/src/lib/supabase";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  /** Screen to open on tap: "/job/[id]" for workers, "/admin-job/[id]" for admins. */
  route: "/job/[id]" | "/admin-job/[id]" | null;
  jobId: string | null;
  isRead: boolean;
  createdAt: string;
}

const ROUTES = ["/job/[id]", "/admin-job/[id]"] as const;

export function notificationTarget(data: unknown): { route: AppNotification["route"]; jobId: string | null } {
  const d = (data ?? {}) as { route?: unknown; jobId?: unknown };
  const route = ROUTES.find((r) => r === d.route) ?? null;
  return { route, jobId: typeof d.jobId === "string" ? d.jobId : null };
}

function formatDbNotification(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.message,
    ...notificationTarget(row.metadata),
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

// Token registered by this device in this session, so logout can remove it
let registeredToken: string | null = null;

// Asks for permission and saves this device's Expo push token for the signed-in user.
// Returns quietly when push isn't possible (simulator, permission denied, no EAS projectId).
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;

  if (Platform.OS === "android") {
    // Must match channelId in supabase/functions/send-push
    await Notifications.setNotificationChannelAsync("default", {
      name: "Shift updates",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === "granted" ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Push disabled: no EAS projectId. Run `eas init` to add it to app.json.");
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("register_push_token", { p_token: token });
  if (error) throw error;
  registeredToken = token;
}

// Call before signOut: RLS needs the session to delete the row.
export async function unregisterPushToken(): Promise<void> {
  if (!registeredToken) return;
  const { error } = await supabase.from("push_tokens").delete().eq("token", registeredToken);
  if (error) throw error;
  registeredToken = null;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, metadata, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(formatDbNotification);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function clearNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
  if (error) throw error;
}
