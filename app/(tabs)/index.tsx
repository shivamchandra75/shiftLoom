import React, { useEffect } from "react";
import { View, Text, ScrollView, FlatList, Pressable } from "react-native";
import { useAuthStore } from "@/src/store/useAuthStore";
import { JobCard } from "@/components/JobCard";
import { useJobStore } from "@/src/store/useJobStore";
import { useRouter } from "expo-router";
import { getFormattedDate } from "@/src/lib/utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";


export default function HomeScreen() {
  const { user } = useAuthStore();
  const {
    getJobs,
    isLoading: isJobLoading,
    jobList,
    getSavedJobs,
    savedJobIds,
    toggleSaveJob
  } = useJobStore();
  const router = useRouter();

  // console.log(jobList?.[0]);

  useEffect(() => {
    if (user?.role && user.role !== 'admin') getJobs(user.role);
    if (user?.id) getSavedJobs(user.id);
  }, [user?.role, user?.id]);

  return (
    <ScrollView
      className="flex-grow bg-background"
      contentContainerClassName="flex-grow px-6 py-12 justify-center"
    >
      <View className="gap-8 max-w-md w-full self-center">
        {/* Top Header Bar */}
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-body-medium text-on-surface-variant">Welcome back,</Text>
            <Text className="text-headline-small font-bold text-on-surface">{user?.firstName || 'User'}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            className="w-12 h-12 rounded-full border border-outline bg-surface items-center justify-center active:opacity-70"
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color="#747775" />
          </Pressable>
        </View>

        <View className="bg-surface border border-outline rounded-3xl p-6 gap-4">
          <Text className="text-title-large text-on-surface font-bold border-b border-outline pb-2">
            Account Profile
          </Text>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Email</Text>
            <Text className="text-body-medium text-on-surface font-medium">{user?.firstName}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">User Role</Text>
            <View className="bg-secondary px-3 py-1 rounded-full border border-outline">
              <Text className="text-label-medium text-on-secondary font-bold capitalize">
                {user?.role}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Verification Status</Text>
            <View
              className={`px-3 py-1 rounded-full ${user?.isVerified ? "bg-success" : "bg-warning"
                }`}
            >
              <Text className="text-label-medium text-on-primary font-bold">
                {user?.isVerified ? "Verified" : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        {/* Available Shifts Section */}
        <View className="gap-4">
          <Text className="text-title-medium text-on-surface font-bold">
            Available Shifts
          </Text>
          <FlatList
            data={jobList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <JobCard
                companyName={item.companyName}
                location={item.locationAddress}
                createdAt={getFormattedDate(item.createdAt)}
                wage={item?.jobRoles?.[0].wageInr}
                isSaved={savedJobIds.includes(item.id)}
                onSaveToggle={() => user?.id && toggleSaveJob(item, user.id)}
                onPress={() => router.push({ pathname: '/job/[id]', params: { id: item.id } })}
                className="mb-3"
              />
            )}
            scrollEnabled={false}
          />
        </View>
      </View>
    </ScrollView>
  );
}
