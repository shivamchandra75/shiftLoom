import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export interface JobCardProps {
  companyName: string;
  location: string;
  wage: number | string;
  logoUrl?: string;
  onPress?: () => void;
  className?: string;
  createdAt: string;
}

export function JobCard({
  companyName,
  location,
  createdAt,
  wage,
  logoUrl,
  onPress,
  className = "",
}: JobCardProps) {
  // Format wage to show currency symbol nicely
  const formattedWage = typeof wage === "number" 
    ? `₹ ${wage}` 
    : (wage && typeof wage === "string" && wage.startsWith("₹")) 
      ? wage 
      : `₹ ${wage || 0}`;

  return (
    <Pressable
      onPress={onPress}
      className={`border border-outline bg-surface rounded-2xl p-5 gap-3 ${className}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-md border border-outline bg-surface items-center justify-center overflow-hidden">
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="office-building-outline" size={24} color="#747775" />
          )}
        </View>

        <View className="flex-1 justify-center">
          <Text
            className="text-title-medium font-bold text-on-surface"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {companyName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <MaterialCommunityIcons name="map-marker-outline" size={14} color="#747775" />
            <Text
              className="text-body-small text-on-surface-variant ml-0.5"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {location}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <Text className=" font-bold text-on-surface-variant mt-1">
          {formattedWage} per shift
        </Text>

        <Text className="text-body-small text-gray-400  font-medium">
          {createdAt}
        </Text>
      </View>
    </Pressable>
  );
}
