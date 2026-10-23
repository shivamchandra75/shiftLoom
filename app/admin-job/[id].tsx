import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Linking, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useJobStore } from "@/src/store/useJobStore";
import { fetchJobAssignments, JobAssignment } from "@/src/services/jobService";
import { canCancelShift, formatDate, formatTimeTo12Hour } from "@/src/lib/utils";
import { CancelReasonModal } from "@/components/CancelReasonModal";

const CANCEL_REASONS = ["Weather", "Client cancelled", "Insufficient staff", "Venue unavailable", "Other"];

const ROLE_LABELS: Record<string, string> = { driver: "Drivers", steward: "Stewards", chef: "Chefs" };

export default function AdminJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { adminJobList, savedJobList, cancelAdminJob, isCancelling } = useJobStore();
  const job = adminJobList.find((j) => j.id === id) ?? savedJobList.find((j) => j.id === id);

  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);

  const load = () => {
    setIsLoading(true);
    setError(null);
    fetchJobAssignments(id)
      .then(setAssignments)
      .catch((e) => setError(e?.message || "Failed to load workers"))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [id]);

  if (!job) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-body-medium text-on-surface-variant">Job not found.</Text>
      </View>
    );
  }

  const isCancellable = job.status === "open" || job.status === "closed";
  const inWindow = canCancelShift(job.date);

  const handleConfirmCancel = async (reason: string) => {
    try {
      await cancelAdminJob(job.id, reason);
      setIsCancelModalVisible(false);
      Alert.alert("Job Cancelled", "The job has been cancelled.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to cancel job.");
    }
  };

  return (
    <View className="flex-1 bg-background">
    <ScrollView className="flex-1" contentContainerClassName="p-6 gap-6">
      <View className="bg-surface border border-outline rounded-3xl p-6 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-title-large font-bold text-on-surface flex-1" numberOfLines={2}>{job.companyName}</Text>
          {job.status && (
            <View className="px-3 py-1 rounded-full border border-outline">
              <Text className="text-label-medium text-on-surface-variant capitalize">{job.status}</Text>
            </View>
          )}
        </View>
        <Text className="text-body-medium text-on-surface-variant">
          {formatDate(job.date)} · {formatTimeTo12Hour(job.startTime)} – {formatTimeTo12Hour(job.endTime)}
        </Text>
        <View className="flex-row items-center gap-1">
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#747775" />
          <Text className="text-body-medium text-on-surface-variant flex-1">{job.locationAddress}</Text>
        </View>
        {job.cancelReason && (
          <Text className="text-body-small text-error">Cancelled: {job.cancelReason}</Text>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <View className="items-center gap-2">
          <Text className="text-body-medium text-error text-center">{error}</Text>
          <Pressable onPress={load}>
            <Text className="text-label-large text-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        job.jobRoles.map((jobRole) => {
          const filled = assignments.filter((a) => a.role === jobRole.role);
          const open = Math.max(jobRole.totalSlots - filled.length, 0);
          return (
            <View key={jobRole.id} className="bg-surface border border-outline rounded-3xl p-6 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-title-medium font-bold text-on-surface">
                  {ROLE_LABELS[jobRole.role] ?? jobRole.role}: {filled.length}/{jobRole.totalSlots}
                  {open === 0 ? " ✅" : ""}
                </Text>
                <Text className="text-body-medium text-on-surface-variant">₹ {jobRole.wageInr}/shift</Text>
              </View>
              {filled.map((a) => (
                <View key={a.applicationId} className="flex-row items-center gap-3">
                  <MaterialCommunityIcons name="account-circle" size={32} color="#747775" />
                  <View className="flex-1">
                    <Text className="text-body-large text-on-surface">{a.name}</Text>
                    {!!a.email && (
                      <Text className="text-body-small text-primary" onPress={() => Linking.openURL(`mailto:${a.email}`)}>
                        {a.email}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {Array.from({ length: open }, (_, i) => (
                <View key={i} className="flex-row items-center gap-3 opacity-60">
                  <MaterialCommunityIcons name="account-outline" size={32} color="#747775" />
                  <Text className="text-body-medium text-on-surface-variant">Open slot</Text>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>

      {isCancellable && (
        <View className="p-6 pb-10 border-t border-outline bg-surface">
          <Pressable
            className={`w-full py-4 rounded-full items-center justify-center flex-row ${
              !inWindow || isCancelling ? "bg-surface-variant" : "bg-red-600 active:opacity-90"
            }`}
            disabled={!inWindow || isCancelling}
            onPress={() => setIsCancelModalVisible(true)}
          >
            <MaterialCommunityIcons
              name={inWindow ? "close-circle-outline" : "clock-alert-outline"}
              size={20}
              color={!inWindow || isCancelling ? "#747775" : "#FFFFFF"}
            />
            <Text className={`font-bold text-title-medium ml-2 ${!inWindow || isCancelling ? "text-on-surface-variant" : "text-white"}`}>
              {isCancelling ? "Cancelling Job..." : inWindow ? "Cancel Job" : "Cannot Cancel (Within 2 days)"}
            </Text>
          </Pressable>
        </View>
      )}

      <CancelReasonModal
        visible={isCancelModalVisible}
        title="Cancel Job"
        description="Choose a reason. Workers who accepted this job will see it."
        reasons={CANCEL_REASONS}
        keepLabel="Keep Job"
        isSubmitting={isCancelling}
        onClose={() => setIsCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}
