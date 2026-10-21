import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { JobCard } from "@/components/JobCard";
import { useRouter } from "expo-router";
import { getFormattedDate } from "@/src/lib/utils";
import { UserJob } from "@/src/services/jobService";

type ShiftFilterStatus = 'accepted' | 'completed' | 'cancelled_by_user';

const FILTER_TABS: { label: string; status: ShiftFilterStatus }[] = [
  { label: 'Accepted', status: 'accepted' },
  { label: 'Completed', status: 'completed' },
  { label: 'Cancelled', status: 'cancelled_by_user' },
];

function matchesStatus(item: UserJob, filter: ShiftFilterStatus): boolean {
  if (!item) return false;
  if (filter === 'completed') {
    return item.status === 'completed' || item.job?.status === 'completed';
  }
  if (filter === 'cancelled_by_user') {
    return (
      item.status === 'cancelled_by_user' ||
      item.status === 'cancelled' ||
      item.job?.status === 'cancelled'
    );
  }
  if (filter === 'accepted') {
    return (
      (item.status === 'accepted' || !item.status) &&
      item.status !== 'cancelled_by_user' &&
      item.status !== 'cancelled' &&
      item.job?.status !== 'completed' &&
      item.job?.status !== 'cancelled'
    );
  }
  return false;
}

export default function MyShiftsScreen() {
  const { user } = useAuthStore();
  const { userJobList, getUserJobs, isLoading } = useJobStore();
  const [selectedStatus, setSelectedStatus] = useState<ShiftFilterStatus>('accepted');
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      getUserJobs(user.id);
    }
  }, [user?.id]);

  const filteredShifts = userJobList.filter(
    (item) => item && matchesStatus(item, selectedStatus)
  );

  if (isLoading && userJobList.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-6 px-6">
      <View style={tabStyles.container}>
        {FILTER_TABS.map((tab) => {
          const isActive = selectedStatus === tab.status;
          const count = userJobList.filter((j) => j && matchesStatus(j, tab.status)).length;

          return (
            <TouchableOpacity
              key={tab.status}
              activeOpacity={0.7}
              onPress={() => setSelectedStatus(tab.status)}
              style={[tabStyles.tabButton, isActive && tabStyles.tabButtonActive]}
            >
              <Text style={[tabStyles.tabLabel, isActive && tabStyles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredShifts}
        keyExtractor={(item) => item.applicationId}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center mt-12 px-4">
            <Text className="text-title-medium font-semibold text-on-surface text-center mb-1">
              {selectedStatus === 'accepted'
                ? 'No active shifts'
                : selectedStatus === 'completed'
                ? 'No completed shifts yet'
                : 'No cancelled shifts'}
            </Text>
            <Text className="text-body-medium text-on-surface-variant text-center">
              {selectedStatus === 'accepted'
                ? 'Apply to shifts from the home feed to see them here.'
                : selectedStatus === 'completed'
                ? 'Shifts you finish will show up here.'
                : 'Shifts you have cancelled will be listed here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <JobCard
            companyName={item.job?.companyName ?? "Unknown Company"}
            location={item.job?.locationAddress ?? "Location unavailable"}
            createdAt={getFormattedDate(item.job?.createdAt ?? "")}
            wage={
              item.job?.jobRoles?.find((r) => r.role === item.role)?.wageInr ??
              item.job?.jobRoles?.[0]?.wageInr ??
              0
            }
            onPress={() =>
              item.job?.id &&
              router.push({ pathname: '/job/[id]', params: { id: item.job.id } })
            }
            className="mb-4"
          />
        )}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#F0F4F9',
    borderColor: '#E3E3E3',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E3E3',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: '#444746',
  },
  tabLabelActive: {
    color: '#0B57D0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: '#E8EDF2',
  },
  badgeActive: {
    backgroundColor: '#E6F4FE',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#444746',
  },
  badgeTextActive: {
    color: '#0B57D0',
  },
});

