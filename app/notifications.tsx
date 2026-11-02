import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import { colors } from "@/src/theme/tokens";
import { formatDayMonth } from "@/src/lib/utils";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { IconButton } from "@/components/ui/IconButton";
import { ListItem } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { Snackbar } from "@/components/ui/snackbar";

export default function NotificationsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { notifications, isLoading, error, load, markAllRead, remove, clearAll } = useNotificationStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    load(userId);
    // Mark read on leave so unread rows stay highlighted while the screen is open
    return () => {
      markAllRead(userId);
    };
  }, [userId, load, markAllRead]);

  const onClearAll = async () => {
    if (!userId) return;
    setClearing(true);
    await clearAll(userId).catch(() => {}); // error is shown by the snackbar
    setClearing(false);
    setConfirmClear(false);
  };

  const empty = error ? (
    <EmptyState icon="cloud_off" title="Couldn't load notifications" body={error} actionLabel="Try again" onAction={() => userId && load(userId)} />
  ) : (
    <EmptyState icon="notifications_none" title="No notifications" body="Shift cancellations show up here." />
  );

  return (
    <Screen>
      <TopAppBarSmall
        title="Notifications"
        trailing={notifications.length > 0 && <IconButton icon="clear_all" accessibilityLabel="Clear all notifications" onPress={() => setConfirmClear(true)} />}
      />
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshing={isLoading && notifications.length > 0}
        onRefresh={() => userId && load(userId)}
        contentContainerClassName="px-4 pb-6 pt-2"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={isLoading ? <ActivityIndicator className="py-12" color={colors.primary} /> : empty}
        renderItem={({ item }) => (
          <View className={`overflow-hidden rounded-xl ${item.isRead ? "bg-surface" : "bg-primary-container"}`}>
            <ListItem
              leadingIcon="event_busy"
              headline={item.title}
              supportingText={`${item.body}\n${formatDayMonth(item.createdAt)}`}
              accessibilityLabel={`${item.isRead ? "" : "Unread. "}${item.title}. ${item.body}`}
              onPress={item.route && item.jobId ? () => router.push({ pathname: item.route!, params: { id: item.jobId! } }) : undefined}
              trailing={<IconButton icon="close" accessibilityLabel="Delete notification" onPress={() => remove(item.id)} />}
            />
          </View>
        )}
      />
      <Dialog
        visible={confirmClear}
        icon="clear_all"
        title="Clear all notifications?"
        body="This permanently deletes every notification in your inbox."
        confirmLabel="Clear all"
        tone="error"
        loading={clearing}
        onConfirm={onClearAll}
        onDismiss={() => setConfirmClear(false)}
      />
      <Snackbar
        message={error && notifications.length > 0 ? { text: error, tone: "error" } : null}
        onHide={() => useNotificationStore.setState({ error: null })}
      />
    </Screen>
  );
}
