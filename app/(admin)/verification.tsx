import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { fetchVerificationQueue, QueueWorker, VerificationStatus } from "@/src/services/verificationService";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/Tabs";
import { Panel } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkerListItem } from "@/components/WorkerListItem";

const TABS: { label: string; value: VerificationStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Rejected", value: "rejected" },
  { label: "Verified", value: "verified" },
];

const EMPTY: Record<VerificationStatus, { icon: string; title: string; body: string }> = {
  pending: { icon: "verified_user", title: "No workers waiting", body: "You're all caught up. New document submissions show up here." },
  rejected: { icon: "block", title: "No rejected workers", body: "Workers whose documents you reject show up here until they upload new ones." },
  verified: { icon: "how_to_reg", title: "No verified workers yet", body: "Workers appear here once all their documents are approved." },
};

export default function VerificationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<VerificationStatus>("pending");
  const [query, setQuery] = useState("");
  const [workers, setWorkers] = useState<QueueWorker[]>([]);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setIsLoading(true);
    setError("");
    fetchVerificationQueue(tab)
      .then((list) => {
        setWorkers(list);
        if (tab === "pending") setPendingCount(list.length);
      })
      .catch((e) => setError(e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || "Couldn't load workers."))
      .finally(() => setIsLoading(false));
  }, [tab]);

  // Reload on focus so decisions made on the review screen show up here
  useFocusEffect(load);

  const q = query.trim().toLowerCase();
  const visible = (q ? workers.filter((w) => w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q)) : workers)
    // Pending queue: oldest submission first, so nobody waits longest. History: newest first.
    .sort((a, b) => a.lastSubmittedAt.localeCompare(b.lastSubmittedAt) * (tab === "pending" ? 1 : -1));

  const empty = error ? (
    <EmptyState icon="cloud_off" title="Couldn't load workers" body={error} actionLabel="Try again" onAction={load} />
  ) : q ? (
    <EmptyState icon="search" title={`No workers match "${query.trim()}"`} body="Check the spelling, or clear the search." actionLabel="Clear search" onAction={() => setQuery("")} />
  ) : (
    <EmptyState {...EMPTY[tab]} />
  );

  return (
    <Screen>
      <TopAppBarLarge
        title="Verification"
        supportingText={pendingCount ? `${pendingCount} ${pendingCount === 1 ? "worker" : "workers"} waiting for review` : undefined}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 px-4 pb-6 pt-2"
        refreshControl={<RefreshControl refreshing={isLoading && workers.length > 0} onRefresh={load} />}
      >
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or email" />
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {isLoading && workers.length === 0 ? (
          <ActivityIndicator className="py-12" color={colors.primary} />
        ) : visible.length === 0 ? (
          empty
        ) : (
          <Panel>
            {visible.map((w) => (
              <WorkerListItem key={w.id} worker={w} onPress={() => router.push({ pathname: "/admin-user/[id]", params: { id: w.id } })} />
            ))}
          </Panel>
        )}
      </ScrollView>
    </Screen>
  );
}
