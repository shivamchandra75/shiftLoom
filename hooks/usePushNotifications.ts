import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { notificationTarget, registerPushToken } from "@/src/services/notificationService";
import { useNotificationStore } from "@/src/store/useNotificationStore";

// Show pushes as banners while the app is open too
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Registers this device for the signed-in user, refreshes the inbox when a push arrives,
// and opens the shift when a push is tapped (including cold start).
export function usePushNotifications(userId: string | undefined) {
  const router = useRouter();
  const load = useNotificationStore((s) => s.load);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    registerPushToken().catch((e) => console.error("Push registration failed:", e));
    load(userId);
    const sub = Notifications.addNotificationReceivedListener(() => load(userId));
    return () => sub.remove();
  }, [userId, load]);

  useEffect(() => {
    if (!userId || !lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const { route, jobId } = notificationTarget(lastResponse.notification.request.content.data);
    if (route && jobId) router.push({ pathname: route, params: { id: jobId } });
  }, [userId, lastResponse, router]);
}
