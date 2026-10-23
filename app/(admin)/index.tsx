import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { JobCard } from "@/components/JobCard";
import { SearchBar } from "@/components/ui/search-bar";
import { formatDate, getFormattedDate, toYmd } from "@/src/lib/utils";

type SortKey = "event" | "posted";
type StatusFilter = "all" | "open" | "completed" | "cancelled";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${active ? "bg-primary border-primary" : "border-outline bg-surface"}`}
    >
      <Text className={`text-label-medium ${active ? "text-on-primary" : "text-on-surface-variant"}`}>{label}</Text>
    </Pressable>
  );
}

export default function AdminHomeScreen() {
  const { user } = useAuthStore();
  const { adminJobList, getAdminJobs, isLoading, error, savedJobIds, getSavedJobs, toggleSaveJob } = useJobStore();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("event");
  const [ascending, setAscending] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [picking, setPicking] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    if (user?.id) {
      getAdminJobs(user.id);
      getSavedJobs(user.id);
    }
  }, [user?.id]);

  // shortcut: client-side search/filter/sort, move to Supabase query params if an admin's job count grows large
  const jobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = adminJobList.filter(
      (j) =>
        (!q || j.companyName.toLowerCase().includes(q) || j.locationAddress.toLowerCase().includes(q)) &&
        (status === "all" || j.status === status) &&
        (!fromDate || j.date >= fromDate) &&
        (!toDate || j.date <= toDate)
    );
    const key = sortKey === "event" ? "date" : "createdAt";
    return filtered.sort((a, b) => a[key].localeCompare(b[key]) * (ascending ? 1 : -1));
  }, [adminJobList, search, status, fromDate, toDate, sortKey, ascending]);

  return (
    <View className="flex-1 bg-background pt-16 px-6">
      <Text className="text-headline-medium font-bold text-on-surface mb-4">My Jobs</Text>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search company or location..." />

      <View className="flex-row flex-wrap gap-2 mt-4">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
        ))}
      </View>

      <View className="flex-row flex-wrap items-center gap-2 mt-3">
        <Chip label={fromDate ? `From ${formatDate(fromDate)}` : "From date"} active={!!fromDate} onPress={() => setPicking("from")} />
        <Chip label={toDate ? `To ${formatDate(toDate)}` : "To date"} active={!!toDate} onPress={() => setPicking("to")} />
        {(fromDate || toDate) && (
          <Pressable onPress={() => { setFromDate(null); setToDate(null); }} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#747775" />
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center gap-2 mt-3 mb-4">
        <Text className="text-label-medium text-on-surface-variant">Sort:</Text>
        <Chip label="Event date" active={sortKey === "event"} onPress={() => setSortKey("event")} />
        <Chip label="Post date" active={sortKey === "posted"} onPress={() => setSortKey("posted")} />
        <Pressable
          onPress={() => setAscending((a) => !a)}
          accessibilityLabel={ascending ? "Sort ascending" : "Sort descending"}
          hitSlop={8}
          className="ml-auto p-1"
        >
          <MaterialCommunityIcons name={ascending ? "sort-ascending" : "sort-descending"} size={24} color="#747775" />
        </Pressable>
      </View>

      {picking && (
        <DateTimePicker
          mode="date"
          value={new Date(((picking === "from" ? fromDate : toDate) ?? toYmd(new Date())) + "T00:00:00")}
          onChange={(event, date) => {
            setPicking(null);
            if (event.type !== "set" || !date) return;
            (picking === "from" ? setFromDate : setToDate)(toYmd(date));
          }}
        />
      )}

      {isLoading && adminJobList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : error && adminJobList.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-body-medium text-error text-center">{error}</Text>
          <Pressable onPress={() => user?.id && getAdminJobs(user.id)}>
            <Text className="text-label-large text-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => user?.id && getAdminJobs(user.id)}
          ListEmptyComponent={
            <Text className="text-body-medium text-on-surface-variant text-center mt-12">
              {adminJobList.length ? "No jobs match your filters." : "You haven't posted any jobs yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <JobCard
              companyName={item.companyName}
              location={item.locationAddress}
              createdAt={item.date ? formatDate(item.date) : getFormattedDate(item.createdAt)}
              wage={item.jobRoles?.[0]?.wageInr ?? 0}
              status={item.status}
              isSaved={savedJobIds.includes(item.id)}
              onSaveToggle={() => user?.id && toggleSaveJob(item, user.id)}
              onPress={() => router.push({ pathname: "/admin-job/[id]", params: { id: item.id } })}
              className="mb-4"
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push("/admin-job/new")}
        accessibilityLabel="Post a new job"
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-lg active:opacity-90"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
