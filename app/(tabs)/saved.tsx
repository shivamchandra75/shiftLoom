import React, { useEffect } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useJobStore } from "@/src/store/useJobStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { Job } from "@/src/services/jobService";
import { colors } from "@/src/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { Menu } from "@/components/ui/Menu";
import { JobListItem } from "@/components/JobListItem";
import { FilterSheet } from "@/components/FilterSheet";
import { useListControls } from "@/hooks/useListControls";
import { NO_FILTERS, SORT_OPTIONS, ShiftFilters, SortKey, filterCount, matchesFilters, roleWage, sortJobs, sortLabel } from "@/src/lib/shiftFilters";

const SAVED_SORT: { label: string; value: SortKey }[] = [{ label: "Recently saved", value: "saved" }, ...SORT_OPTIONS];

export default function SavedJobsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { savedJobList, getSavedJobs, toggleSaveJob, isLoading } = useJobStore();
  const c = useListControls("saved");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user?.id) getSavedJobs(user.id);
  }, [user?.id, getSavedJobs]);

  const wageOf = (j: Job) => roleWage(j, user?.role);
  const matching = (f: ShiftFilters) => savedJobList.filter((j) => matchesFilters(j, f, wageOf(j)));
  const visible = sortJobs(matching(c.filters), c.sort, (j) => ({ date: j.date, startTime: j.startTime, wage: wageOf(j) }));
  const count = savedJobList.length;

  return (
    <Screen>
      <TopAppBarLarge title="Saved" supportingText={count ? `${count} ${count === 1 ? "shift" : "shifts"}` : undefined} />
      <FlatList
        data={visible}
        keyExtractor={(j) => j.id}
        contentContainerClassName="px-4 pt-2 pb-24"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          isLoading && count === 0 ? (
            <ActivityIndicator className="py-12" color={colors.primary} />
          ) : count > 0 ? (
            <EmptyState icon="filter_list" title="No saved shifts match your filters" body="Remove a filter to see more shifts." actionLabel="Clear filters" onAction={() => c.setFilters(NO_FILTERS)} />
          ) : (
            <EmptyState
              icon="bookmark_border"
              title="No saved shifts yet"
              body="Tap the bookmark on any shift to keep it here."
              actionLabel="Browse shifts"
              onAction={() => router.navigate(isAdmin ? "/(admin)" : "/(tabs)")}
            />
          )
        }
        renderItem={({ item }) => (
          <JobListItem
            job={item}
            wage={wageOf(item)}
            saved
            onToggleSave={() => user?.id && toggleSaveJob(item, user.id)}
            onPress={() => router.push({ pathname: isAdmin ? "/admin-job/[id]" : "/job/[id]", params: { id: item.id } })}
          />
        )}
      />
      {count > 0 && (
        <View className="absolute bottom-4 left-0 right-0">
          <FloatingToolbar
            sortRef={c.sortRef}
            sortLabel={sortLabel(c.sort)}
            onSortPress={c.openSort}
            onFilterPress={() => c.setFilterOpen(true)}
            filterCount={filterCount(c.filters)}
          />
        </View>
      )}
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
      <Menu anchor={c.sortAnchor} placement="above" options={SAVED_SORT} value={c.sort} onSelect={c.setSort} onDismiss={c.closeSort} />
    </Screen>
  );
}
