import React, { useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { JobCard } from "@/components/JobCard";
import { useRouter } from "expo-router";
import { getFormattedDate } from "@/src/lib/utils";

export default function MyShiftsScreen() {
  const { user } = useAuthStore();
  const { userJobList, getUserJobs, isLoading } = useJobStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      getUserJobs(user.id);
    }
  }, [user?.id]);

  console.log('✅ my shift',userJobList?.[1]);

  if (isLoading && userJobList.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-6 px-6">
      <FlatList
        data={userJobList}
        keyExtractor={(item) => item.applicationId}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-body-large text-on-surface-variant text-center mt-10">
            You haven't applied to any shifts yet.
          </Text>
        }
        renderItem={({ item }) => (
          <JobCard
            companyName={item.job.companyName}
            location={item.job.locationAddress}
            createdAt={getFormattedDate(item.job.createdAt)}
            wage={item.job.jobRoles.find(r => r.role === item.role)?.wageInr ?? item.job.jobRoles[0]?.wageInr ?? 0}
            onPress={() => router.push({ pathname: '/job/[id]', params: { id: item.job.id } })}
            className="mb-4"
          />
        )}
      />
    </View>
  );
}
