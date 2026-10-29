import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { colors } from "@/src/theme/tokens";
import type { Job } from "@/src/services/jobService";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/Tabs";
import { AssistChip } from "@/components/ui/Chip";
import { Subheader } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Menu } from "@/components/ui/Menu";
import { AdminJobListItem, jobSlots } from "@/components/AdminJobListItem";
import { useListControls } from "@/hooks/useListControls";
import { matchesSearch } from "@/src/lib/shiftFilters";

type StatusTab = "active" | "completed" | "cancelled" | "all";
type AdminSort = "event-asc" | "event-desc" | "posted-desc" | "posted-asc";

const TABS: { label: string; value: StatusTab }[] = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
];
const SORTS: { label: string; value: AdminSort }[] = [
  { label: "Event date, soonest first", value: "event-asc" },
  { label: "Event date, latest first", value: "event-desc" },
  { label: "Posted, newest first", value: "posted-desc" },
  { label: "Posted, oldest first", value: "posted-asc" },
];
const NOUN: Record<StatusTab, string> = { active: "active shifts", completed: "completed shifts", cancelled: "cancelled shifts", all: "shifts" };

// Active = still running: open (needs workers) or closed (full) and not yet completed or cancelled.
const isLive = (j: Job) => j.status === "open" || j.status === "closed";
const inTab = (j: Job, tab: StatusTab) => tab === "all" || (tab === "active" ? isLive(j) : j.status === tab);

// shortcut: search, filter and sort run on the loaded list; move to Supabase query params if an admin's job count grows large
function sortJobs(jobs: Job[], key: AdminSort): Job[] {
  const field = key.startsWith("event") ? (j: Job) => `${j.date} ${j.startTime}` : (j: Job) => j.createdAt;
  const sorted = [...jobs].sort((a, b) => field(a).localeCompare(field(b)));
  return key.endsWith("desc") ? sorted.reverse() : sorted;
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { adminJobList, getAdminJobs, isLoading, error, getSavedJobs } = useJobStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StatusTab>("active");
  const c = useListControls<AdminSort>("event-asc");
  const [fabExtended, setFabExtended] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    getAdminJobs(user.id);
    getSavedJobs(user.id);
  }, [user?.id, getAdminJobs, getSavedJobs]);

  const reload = () => user?.id && getAdminJobs(user.id);
  const needWorkers = adminJobList.filter((j) => isLive(j) && jobSlots(j).open > 0).length;
  const visible = sortJobs(adminJobList.filter((j) => inTab(j, tab) && matchesSearch(j, query)), c.sort);
  const count = visible.length;

  // Extended FAB collapses to an icon while the list scrolls down and expands again on scroll up
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;
    if (y <= 0 || dy < -4) setFabExtended(true);
    else if (dy > 4) setFabExtended(false);
  };

  const empty = error ? (
    <EmptyState icon="cloud_off" title="Couldn't load your shifts" body={error} actionLabel="Try again" onAction={reload} />
  ) : query.trim() ? (
    <EmptyState icon="search" title={`No shifts match "${query.trim()}"`} body="Try another company or area, or clear the search." actionLabel="Clear search" onAction={() => setQuery("")} />
  ) : adminJobList.length === 0 ? (
    <EmptyState icon="post_add" title="No shifts posted yet" body="Post your first shift. Workers with a matching role will see it right away." />
  ) : (
    <EmptyState icon="event_busy" title={`No ${NOUN[tab]}`} body="Shifts in this list will show up here." />
  );

  return (
    <Screen>
      <TopAppBarLarge
        title="My jobs"
        supportingText={needWorkers ? `${needWorkers} ${needWorkers === 1 ? "shift still needs" : "shifts still need"} workers` : undefined}
      />
      <FlatList
        data={visible}
        keyExtractor={(j) => j.id}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshing={isLoading && adminJobList.length > 0}
        onRefresh={reload}
        contentContainerClassName="px-4 pb-28 pt-2"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search company or location" />
            <Tabs tabs={TABS} value={tab} onChange={setTab} />
            {adminJobList.length > 0 && (
              <Subheader
                label={`${count} ${count === 1 ? NOUN[tab].replace(/s$/, "") : NOUN[tab]}`}
                trailing={
                  <View ref={c.sortRef} collapsable={false}>
                    <AssistChip icon="swap_vert" label={c.sort.startsWith("event") ? "Event date" : "Posted"} onPress={c.openSort} />
                  </View>
                }
              />
            )}
          </View>
        }
        ListEmptyComponent={isLoading ? <ActivityIndicator className="py-12" color={colors.primary} /> : empty}
        renderItem={({ item }) => (
          <AdminJobListItem job={item} onPress={() => router.push({ pathname: "/admin-job/[id]", params: { id: item.id } })} />
        )}
      />
      <Fab label="Post a shift" icon="add" extended={fabExtended} onPress={() => router.push("/admin-job/new")} className="absolute bottom-4 right-4" />
      <Menu anchor={c.sortAnchor} options={SORTS} value={c.sort} onSelect={c.setSort} onDismiss={c.closeSort} />
    </Screen>
  );
}
