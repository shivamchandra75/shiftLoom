import React, { useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useJobStore } from "@/src/store/useJobStore";
import { JobCard } from "@/components/JobCard";
import { useRouter } from "expo-router";
import { getFormattedDate } from "@/src/lib/utils";

export default function SavedJobsScreen() {
  const { user } = useAuthStore();
  const { savedJobList, getSavedJobs, toggleSaveJob, isLoading } = useJobStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      getSavedJobs(user.id);
    }
  }, [user?.id]);

  console.log('💾 saved job',savedJobList?.[0]);

  return (
    <View className="flex-1 bg-background pt-16 px-6">
      <Text className="text-headline-medium font-bold text-on-surface mb-6">Saved Shifts</Text>

      {isLoading && savedJobList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={savedJobList}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-12 px-4">
              <Text className="text-title-medium font-semibold text-on-surface text-center mb-1">
                No saved shifts yet
              </Text>
              <Text className="text-body-medium text-on-surface-variant text-center">
                Bookmark shifts you're interested in from the job details page to keep track of them here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              companyName={item.companyName}
              location={item.locationAddress}
              createdAt={getFormattedDate(item.createdAt)}
              wage={item.jobRoles?.[0]?.wageInr ?? 0}
              isSaved={true}
              onSaveToggle={() => {
                if (user?.id) {
                  toggleSaveJob(item, user.id);
                }
              }}
              onPress={() => router.push({ pathname: '/job/[id]', params: { id: item.id } })}
              className="mb-4"
            />
          )}
        />
      )}
    </View>
  );
}
