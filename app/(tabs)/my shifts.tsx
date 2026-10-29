import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useJobStore } from "@/src/store/useJobStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { UserJob } from "@/src/services/jobService";
import { colors } from "@/src/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { Menu } from "@/components/ui/Menu";
import { ShiftListItem } from "@/components/ShiftListItem";
import { FilterSheet } from "@/components/FilterSheet";
import { useListControls } from "@/hooks/useListControls";
import { SORT_OPTIONS, ShiftFilters, filterCount, matchesFilters, roleWage, sortJobs, sortLabel } from "@/src/lib/shiftFilters";

type ShiftFilterStatus = "accepted" | "completed" | "cancelled";

const FILTER_TABS: { label: string; value: ShiftFilterStatus }[] = [
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const EMPTY: Record<ShiftFilterStatus, { title: string; body: string }> = {
  accepted: { title: "No upcoming shifts", body: "Shifts you accept from Home show up here." },
  completed: { title: "No completed shifts yet", body: "Shifts you finish show up here." },
  cancelled: { title: "No cancelled shifts", body: "Shifts you cancel show up here." },
};

function matchesStatus(item: UserJob, filter: ShiftFilterStatus): boolean {
  if (!item) return false;
  if (filter === "completed") return item.status === "completed" || item.job?.status === "completed";
  if (filter === "cancelled") return item.status === "cancelled_by_user" || item.status === "cancelled" || item.job?.status === "cancelled";
  return (
    (item.status === "accepted" || !item.status) &&
    item.job?.status !== "completed" &&
    item.job?.status !== "cancelled"
  );
}

export default function MyShiftsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { userJobList, getUserJobs, isLoading } = useJobStore();
  const [status, setStatus] = useState<ShiftFilterStatus>("accepted");
  const c = useListControls("date-asc");

  useEffect(() => {
    if (user?.id) getUserJobs(user.id);
  }, [user?.id, getUserJobs]);

  const wageOf = (i: UserJob) => roleWage(i.job, i.role);
  const matching = (f: ShiftFilters) => userJobList.filter((i) => i?.job && matchesStatus(i, status) && matchesFilters(i.job, f, wageOf(i)));
  const visible = sortJobs(matching(c.filters), c.sort, (i) => ({ date: i.job.date, startTime: i.job.startTime, wage: wageOf(i) }));

  return (
    <Screen>
      <TopAppBarLarge title="My shifts" />
      <View className="px-4 pb-2">
        <Tabs tabs={FILTER_TABS} value={status} onChange={setStatus} />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.applicationId}
        contentContainerClassName="px-4 pt-2 pb-24"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          isLoading && userJobList.length === 0 ? (
            <ActivityIndicator className="py-12" color={colors.primary} />
          ) : (
            <EmptyState icon="work" {...EMPTY[status]} />
          )
        }
        renderItem={({ item }) => (
          <ShiftListItem
            job={item.job}
            wage={wageOf(item)}
            status={status}
            onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.job.id } })}
          />
        )}
      />
      <View className="absolute bottom-4 left-0 right-0">
        <FloatingToolbar
          sortRef={c.sortRef}
          sortLabel={sortLabel(c.sort)}
          onSortPress={c.openSort}
          onFilterPress={() => c.setFilterOpen(true)}
          filterCount={filterCount(c.filters)}
        />
      </View>
      <FilterSheet
        visible={c.filterOpen}
        value={c.filters}
        countFor={(f) => matching(f).length}
        onApply={(f) => {
          c.setFilters(f);
          c.setFilterOpen(false);
        }}
        onDismiss={() => c.setFilterOpen(false)}
      />
      <Menu anchor={c.sortAnchor} placement="above" options={SORT_OPTIONS} value={c.sort} onSelect={c.setSort} onDismiss={c.closeSort} />
    </Screen>
  );
}
