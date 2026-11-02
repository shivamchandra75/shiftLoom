import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { IconButton } from "@/components/ui/IconButton";
import { useNotificationStore } from "@/src/store/useNotificationStore";

// Top bar bell with an unread dot. Opens the notifications inbox.
export function NotificationBell() {
  const router = useRouter();
  const hasUnread = useNotificationStore((s) => s.hasUnread);
  return (
    <View>
      <IconButton
        icon="notifications"
        accessibilityLabel={hasUnread ? "Notifications, unread" : "Notifications"}
        onPress={() => router.push("/notifications")}
      />
      {hasUnread && <View pointerEvents="none" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />}
    </View>
  );
}
