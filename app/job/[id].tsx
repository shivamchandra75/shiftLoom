import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Linking, Share, Alert, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useJobStore } from '@/src/store/useJobStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { formatDate, formatTimeTo12Hour } from '@/src/lib/utils';

const SUPPORT_BG_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" fill="none"><circle cx="360" cy="20" r="80" fill="%23006A60" fill-opacity="0.07"/><circle cx="30" cy="110" r="50" fill="%23006A60" fill-opacity="0.05"/><path d="M-20 60 C 100 10, 180 110, 280 50 C 340 10, 390 80, 420 40" stroke="%23006A60" stroke-width="32" stroke-opacity="0.06"/></svg>`;

const CANCELLATION_REASONS = [
  "Medical / Personal Emergency",
  "Transportation Issue",
  "Schedule Conflict",
  "Other",
];

function canCancelShift(jobDateStr: string): boolean {
  if (!jobDateStr) return false;
  const [year, month, day] = jobDateStr.split('-').map(Number);
  const jobDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = jobDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 2;
}

export default function JobDetailScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const {
    jobList,
    userJobList,
    applyJob,
    isApplying,
    cancelJob,
    isCancelling,
    savedJobIds,
    toggleSaveJob
  } = useJobStore();
  const { user } = useAuthStore();
  
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("Medical / Personal Emergency");
  const [otherReasonText, setOtherReasonText] = useState<string>("");

  const job = jobList.find(j => j.id === id);
  const userApplication = userJobList.find(uj => uj?.job?.id === id);
  const isAccepted = userApplication?.status === 'accepted';
  const isCancelled = userApplication?.status === 'cancelled_by_user';
  const isSaved = job ? savedJobIds.includes(job.id) : false;
  const canCancel = job ? canCancelShift(job.date) : false;

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-on-surface">Job not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 p-2 bg-primary rounded">
          <Text className="text-on-primary font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }


  const roleDetail = user?.role
    ? job.jobRoles.find(r => r.role === user.role)
    : job.jobRoles[0];

  const wage = roleDetail?.wageInr || 0;

  const handleApply = async () => {
    if (!user?.id || !roleDetail?.role) return;
    try {
      await applyJob(job.id, user.id, roleDetail.role);
      Alert.alert('Success', 'Successfully applied for the shift!');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to apply.');
    }
  };

  const handleOpenCancelModal = () => {
    if (!canCancel) {
      Alert.alert(
        "Cancellation Unavailable",
        "Shifts cannot be cancelled within 2 days of their start date."
      );
      return;
    }
    setIsCancelModalVisible(true);
  };

  const handleConfirmCancellation = async () => {
    if (!user?.id || !job) return;
    const formattedReason = selectedReason === "Other"
      ? (otherReasonText.trim() ? `Other: ${otherReasonText.trim()}` : "Other")
      : selectedReason;

    try {
      await cancelJob(job.id, user.id, formattedReason);
      setIsCancelModalVisible(false);
      Alert.alert("Shift Cancelled", "Your shift has been cancelled.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to cancel shift.");
    }
  };

  const handleOpenMaps = () => {
    if (!job.latitude || !job.longitude) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`,
      android: `geo:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`
    });
    if (url) Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this shift at ${job.companyName} on ShiftLoom! Wage: ₹${wage} per shift.`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View className="flex-1 bg-background">

      <ScrollView className="flex-1" contentContainerClassName="p-5 pb-24">
        <Text className="text-headline-medium font-bold text-on-surface mb-6">
          {job.companyName}
        </Text>

        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons name="calendar-clock" size={24} color="#747775" />
          <Text className="ml-3 text-body-large text-on-surface">
            {formatDate(job.date)} • {formatTimeTo12Hour(job.startTime)} - {formatTimeTo12Hour(job.endTime)}
          </Text>
        </View>

        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons name="cash" size={24} color="#747775" />
          <Text className="ml-3 text-body-large text-on-surface">
            ₹{wage} per shift
          </Text>
        </View>

        <View className="flex-row items-center mb-4 gap-3">
          <MaterialCommunityIcons name="account" size={24} color="#747775" />
          <Text className=" text-body-large text-on-surface">
            {roleDetail?.totalSlots} slots
          </Text>
        </View>

        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons name="map-marker" size={24} color="#747775" />
            <Text className="ml-3 text-body-large text-on-surface flex-1">
              {job.locationAddress}
            </Text>
          </View>


          {job.latitude && job.longitude && (
            <View className="rounded-2xl overflow-hidden mt-3 border border-outline">
              <MapView
                style={{ height: 160, width: '100%' }}
                initialRegion={{
                  latitude: job.latitude,
                  longitude: job.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                zoomEnabled={false}
              >
                <Marker 
                  coordinate={{ latitude: job.latitude, longitude: job.longitude }} 
                />
              </MapView>
              <Pressable 
                onPress={handleOpenMaps}
                className="bg-surface/90 absolute bottom-2 right-2 flex-row items-center px-3 py-1.5 rounded-full"
              >
                <Text className="text-primary font-bold text-label-medium mr-1">Open in Maps</Text>
                <MaterialCommunityIcons name="open-in-new" size={14} color="#006A60" />
              </Pressable>
            </View>
          )}
        </View>

        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => {
              if (job && user?.id) {
                toggleSaveJob(job, user.id);
              }
            }}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-full border border-outline ${
              isSaved ? 'bg-black border-black' : 'bg-surface'
            } active:opacity-80`}
          >
            <MaterialCommunityIcons 
              name="bookmark" 
              size={20} 
              color={isSaved ? '#FFFFFF' : '#1F1F1F'} 
            />
            <Text className={`font-semibold ml-2 ${isSaved ? 'text-white' : 'text-on-surface'}`}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="flex-1 flex-row items-center justify-center py-3 rounded-full border border-outline bg-surface active:opacity-80"
          >
            <MaterialCommunityIcons 
              name="share-variant" 
              size={18}
              color="#1F1F1F" 
            />
            <Text className="font-semibold text-on-surface ml-2">Share</Text>
          </Pressable>
        </View>

        {/* Subtle Contact Support Banner */}
        <Pressable
          onPress={() => Linking.openURL('tel:+919876543210')}
          className="w-full relative overflow-hidden rounded-2xl border border-outline/50 bg-surface-variant/20 p-4 mb-6 active:opacity-80"
        >
          {/* SVG Background Layer */}
          <Image
            source={{ uri: SUPPORT_BG_SVG }}
            className="absolute inset-0 w-full h-full"
            contentFit="cover"
            pointerEvents="none"
          />

          {/* Foreground Content */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1 mr-2">
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                <MaterialCommunityIcons name="headphones" size={20} color="#006A60" />
              </View>

              <View className="flex-1">
                <Text className="text-title-small font-semibold text-on-surface">
                  Have questions about this shift?
                </Text>
                <Text className="text-body-small text-on-surface-variant">
                  Contact our support team for quick assistance
                </Text>
              </View>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={20} color="#747775" />
          </View>
        </Pressable>

      </ScrollView>

      <View className="absolute bottom-0 w-full p-4 bg-surface pb-8">
        {isCancelled ? (
          <Pressable
            className="w-full py-4 rounded-full items-center justify-center flex-row bg-surface-variant opacity-75"
            disabled={true}
          >
            <MaterialCommunityIcons name="cancel" size={20} color="#747775" />
            <Text className="font-bold text-title-medium ml-2 text-on-surface-variant">
              Shift Cancelled
            </Text>
          </Pressable>
        ) : isAccepted ? (
          <Pressable
            className={`w-full py-4 rounded-full items-center justify-center flex-row ${
              !canCancel || isCancelling
                ? 'bg-surface-variant'
                : 'bg-red-600 active:opacity-90'
            }`}
            disabled={!canCancel || isCancelling}
            onPress={handleOpenCancelModal}
          >
            <MaterialCommunityIcons
              name={canCancel ? "close-circle-outline" : "clock-alert-outline"}
              size={20}
              color={!canCancel || isCancelling ? "#747775" : "#FFFFFF"}
            />
            <Text
              className={`font-bold text-title-medium ml-2 ${
                !canCancel || isCancelling ? 'text-on-surface-variant' : 'text-white'
              }`}
            >
              {isCancelling
                ? 'Cancelling Shift...'
                : canCancel
                  ? 'Cancel Shift'
                  : 'Cannot Cancel (Within 2 days)'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            className={`w-full py-4 rounded-full items-center justify-center flex-row ${
              !user?.isVerified || isApplying ? 'bg-surface-variant' : 'bg-primary active:opacity-90'
            }`}
            disabled={!user?.isVerified || isApplying}
            onPress={handleApply}
          >
            {isApplying ? (
              <Text className="text-on-surface-variant font-bold text-title-medium ml-2">Applying...</Text>
            ) : !user?.isVerified ? (
              <Text className="text-on-surface-variant font-bold text-title-medium ml-2">Verify Account to Apply</Text>
            ) : (
              <Text className="text-on-primary font-bold text-title-medium ml-2">Accept Offer</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Two-Step Cancellation Modal */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setIsCancelModalVisible(false)}
          />
          <View className="bg-surface rounded-t-3xl p-6 pb-10 border-t border-outline">
            <View className="w-12 h-1.5 bg-outline rounded-full self-center mb-4" />

            <Text className="text-headline-small font-bold text-on-surface mb-1">
              Cancel Shift
            </Text>
            <Text className="text-body-medium text-on-surface-variant mb-5">
              Please choose a reason for cancelling this shift. This feedback helps improve worker scheduling.
            </Text>

            {/* Reason Options */}
            <View className="gap-2.5 mb-4">
              {CANCELLATION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-outline bg-surface-variant/20'
                    }`}
                  >
                    <Text className={`font-medium ${isSelected ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                      {reason}
                    </Text>
                    <MaterialCommunityIcons
                      name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                      size={20}
                      color={isSelected ? "#006A60" : "#747775"}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Input for 'Other' */}
            {selectedReason === "Other" && (
              <View className="mb-4">
                <Text className="text-body-small text-on-surface-variant mb-1 font-medium">
                  Please describe your reason (optional):
                </Text>
                <TextInput
                  value={otherReasonText}
                  onChangeText={setOtherReasonText}
                  placeholder="Enter details here..."
                  placeholderTextColor="#747775"
                  multiline
                  numberOfLines={3}
                  className="p-3 border border-outline rounded-xl bg-surface text-on-surface text-body-medium min-h-[70px]"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            )}

            {/* Modal Actions */}
            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={() => setIsCancelModalVisible(false)}
                className="flex-1 py-3.5 rounded-full border border-outline items-center justify-center active:bg-surface-variant/30"
              >
                <Text className="font-semibold text-on-surface">Keep Shift</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmCancellation}
                disabled={isCancelling}
                className="flex-1 py-3.5 rounded-full bg-red-600 items-center justify-center active:opacity-90"
              >
                <Text className="font-semibold text-white">
                  {isCancelling ? 'Cancelling...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
