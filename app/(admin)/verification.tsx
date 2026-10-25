import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SearchBar } from "@/components/ui/search-bar";
import { getFormattedDate } from "@/src/lib/utils";
import { fetchVerificationQueue, QueueWorker, VerificationStatus } from "@/src/services/verificationService";

const TABS: { value: VerificationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY: Record<VerificationStatus, string> = {
  pending: "No workers waiting for review. You're all caught up.",
  verified: "No verified workers yet.",
  rejected: "No rejected workers.",
};

export default function VerificationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<VerificationStatus>("pending");
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<QueueWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setIsLoading(true);
    setError("");
    fetchVerificationQueue(tab)
      .then(setWorkers)
      .catch((e) => setError(e?.message || "Couldn't load workers."))
      .finally(() => setIsLoading(false));
  }, [tab]);

  // Reload on focus so decisions made on the review screen show up here
  useFocusEffect(load);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? workers.filter((w) => w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q)) : workers;
    // Pending queue: oldest submission first (first in, first reviewed); history: newest first
    return [...list].sort((a, b) => a.lastSubmittedAt.localeCompare(b.lastSubmittedAt) * (tab === "pending" ? 1 : -1));
  }, [workers, search, tab]);

  return (
    <View className="flex-1 bg-background pt-16 px-6">
      <Text className="text-headline-medium font-bold text-on-surface mb-4">Verification</Text>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or email..." />

      <View className="flex-row bg-surface-variant rounded-full p-1 mt-4 mb-4" accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.value }}
            // Keep the class list's shape stable: toggling shadow-* makes NativeWind remount the Pressable outside the navigation context
            className={`flex-1 py-2 rounded-full items-center border ${tab === t.value ? "bg-surface border-outline" : "border-transparent"}`}
          >
            <Text className={`text-label-large ${tab === t.value ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              {t.label}
              {tab === t.value && !isLoading ? ` (${workers.length})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && workers.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-body-medium text-error text-center">{error}</Text>
          <Pressable onPress={load}>
            <Text className="text-label-large text-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(w) => w.id}
          refreshing={isLoading}
          onRefresh={load}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3 pb-6"
          ListEmptyComponent={
            <Text className="text-body-medium text-on-surface-variant text-center mt-12">
              {search ? "No workers match your search." : EMPTY[tab]}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/admin-user/[id]", params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Review ${item.name}, ${item.role}`}
              className="flex-row items-center gap-3 bg-surface border border-outline rounded-2xl p-4 active:bg-surface-variant"
            >
              <View className="w-11 h-11 rounded-full bg-primary items-center justify-center">
                <Text className="text-title-medium font-bold text-on-primary">{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-title-small font-bold text-on-surface" numberOfLines={1}>{item.name}</Text>
                <Text className="text-body-small text-on-surface-variant" numberOfLines={1}>{item.email}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="bg-secondary px-2 py-0.5 rounded-full">
                    <Text className="text-label-small font-bold text-on-secondary capitalize">{item.role}</Text>
                  </View>
                  <Text className="text-label-small text-on-surface-variant">
                    {item.pendingCount > 0 ? `${item.pendingCount} to review` : `${item.docCount} docs`} · {getFormattedDate(item.lastSubmittedAt)}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#747775" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
