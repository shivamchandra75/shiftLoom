import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Linking, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useJobStore } from '@/src/store/useJobStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { formatDate, formatTimeTo12Hour } from '@/src/lib/utils';

export default function JobDetailScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const {
    jobList,
    userJobList,
    applyJob,
    isApplying,
    savedJobIds,
    toggleSaveJob
  } = useJobStore();
  const { user } = useAuthStore();
  
  const job = jobList.find(j => j.id === id);
  const hasApplied = userJobList.some(uj => uj.job.id === id);
  const isSaved = job ? savedJobIds.includes(job.id) : false;

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
      alert('Successfully applied for the shift!');
      router.back();
    } catch (err: any) {
      alert(err.message || 'Failed to apply.');
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

      </ScrollView>

      <View className="absolute bottom-0 w-full p-4 bg-surface pb-8 ">
        <Pressable
          className={`w-full py-4 rounded-full items-center justify-center flex-row ${
            hasApplied || !user?.isVerified || isApplying ? 'bg-surface-variant' : 'bg-primary active:opacity-90'
          }`}
          disabled={hasApplied || !user?.isVerified || isApplying}
          onPress={handleApply}
        >
          {isApplying ? (
            <Text className="text-on-surface-variant font-bold text-title-medium ml-2">Applying...</Text>
          ) : hasApplied ? (
            <Text className="text-on-surface-variant font-bold text-title-medium ml-2">Already Applied</Text>
          ) : !user?.isVerified ? (
            <Text className="text-on-surface-variant font-bold text-title-medium ml-2">Verify Account to Apply</Text>
          ) : (
            <Text className="text-on-primary font-bold text-title-medium ml-2">Accept Offer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
