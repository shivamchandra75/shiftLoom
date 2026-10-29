import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { colors } from "@/src/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/search-bar";
import { AssistChip } from "@/components/ui/Chip";
import { ListItem, Panel, Subheader } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { JobListItem } from "@/components/JobListItem";
import { FilterSheet } from "@/components/FilterSheet";
import { useListControls } from "@/hooks/useListControls";
import { NO_FILTERS, SORT_OPTIONS, ShiftFilters, filterCount, matchesFilters, matchesSearch, roleWage, sortJobs, sortLabel } from "@/src/lib/shiftFilters";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getJobs, isLoading, error, jobList, getSavedJobs, savedJobIds, toggleSaveJob } = useJobStore();
  const [query, setQuery] = useState("");
  const c = useListControls("date-asc");

  useEffect(() => {
    if (user?.role && user.role !== "admin") getJobs(user.role);
    if (user?.id) getSavedJobs(user.id);
  }, [user?.role, user?.id, getJobs, getSavedJobs]);

  const wageOf = (j: (typeof jobList)[number]) => roleWage(j, user?.role);
  const matching = (f: ShiftFilters) => jobList.filter((j) => matchesSearch(j, query) && matchesFilters(j, f, wageOf(j)));
  const visible = sortJobs(matching(c.filters), c.sort, (j) => ({ date: j.date, startTime: j.startTime, wage: wageOf(j) }));
  const activeFilters = filterCount(c.filters);
  const role = user?.role ? `${user.role}s` : "you";

  const listLabel = query.trim()
    ? `${visible.length} ${visible.length === 1 ? "shift" : "shifts"} in ${query.trim()}`
    : activeFilters
      ? `${visible.length} ${visible.length === 1 ? "shift matches" : "shifts match"} your filters`
      : "Available shifts";

  const empty = error ? (
    <EmptyState icon="cloud_off" title="Couldn't load shifts" body={error} actionLabel="Try again" onAction={() => user?.role && user.role !== "admin" && getJobs(user.role)} />
  ) : query.trim() ? (
    <EmptyState icon="search" title={`No shifts in ${query.trim()}`} body="Try a nearby area, or clear the search to see all available shifts." actionLabel="Clear search" onAction={() => setQuery("")} />
  ) : activeFilters ? (
    <EmptyState icon="filter_list" title="No shifts match your filters" body="Remove a filter to see more shifts." actionLabel="Clear filters" onAction={() => c.setFilters(NO_FILTERS)} />
  ) : (
    <EmptyState icon="event_available" title="No shifts right now" body={`New shifts for ${role} show up here. Check back soon.`} />
  );

  return (
    <Screen>
      <TopAppBarLarge
        title={`Hi, ${user?.firstName || "there"}`}
        supportingText={`Shifts open for ${role} near you`}
        trailing={<IconButton icon="notifications" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} />}
      />
      <FlatList
        data={visible}
        keyExtractor={(j) => j.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-4 pb-6 pt-2"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            {!user?.isVerified && (
              <Panel>
                <ListItem
                  leadingIcon="verified_user"
                  leadingTone="warning"
                  headline="Verify your account"
                  supportingText="Upload your documents to start accepting shifts"
                  trailingIcon="chevron_right"
                  onPress={() => router.navigate("/(tabs)/profile")}
                />
              </Panel>
            )}
            <SearchBar value={query} onChangeText={setQuery} />
            <View className="flex-row gap-2">
              <AssistChip
                icon="tune"
                label={activeFilters ? `Filters (${activeFilters})` : "Filter"}
                selected={activeFilters > 0}
                showDropdown={false}
                onPress={() => c.setFilterOpen(true)}
              />
              <View ref={c.sortRef} collapsable={false}>
                <AssistChip icon="swap_vert" label={sortLabel(c.sort)} onPress={c.openSort} />
              </View>
            </View>
            <Subheader label={listLabel} />
          </View>
        }
        ListEmptyComponent={isLoading ? <ActivityIndicator className="py-12" color={colors.primary} /> : empty}
        renderItem={({ item }) => (
          <JobListItem
            job={item}
            wage={wageOf(item)}
            saved={savedJobIds.includes(item.id)}
            onToggleSave={() => user?.id && toggleSaveJob(item, user.id)}
            onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
          />
        )}
      />
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
      <Menu anchor={c.sortAnchor} options={SORT_OPTIONS} value={c.sort} onSelect={c.setSort} onDismiss={c.closeSort} />
    </Screen>
  );
}
