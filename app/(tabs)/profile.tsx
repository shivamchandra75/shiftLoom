import React from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, isLoading } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of ShiftLoom?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Worker";
  const userInitial = user?.firstName?.charAt(0).toUpperCase() || "U";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-6 pb-12"
      style={{ paddingTop: insets.top + 16 }}
    >
      <View className="gap-6 max-w-md w-full self-center">
        {/* Screen Title */}
        <Text className="text-headline-large font-bold text-on-background tracking-tight">
          Profile
        </Text>

        {/* User Card */}
        <View className="bg-surface border border-outline rounded-3xl p-6 items-center gap-3 shadow-sm">
          <View className="w-20 h-20 bg-primary rounded-full items-center justify-center">
            <Text className="text-display-small text-on-primary font-bold">
              {userInitial}
            </Text>
          </View>

          <View className="items-center">
            <Text className="text-title-large font-bold text-on-surface">
              {fullName}
            </Text>
            <Text className="text-body-medium text-on-surface-variant mt-0.5">
              {user?.email}
            </Text>
          </View>

          {/* Badges Row */}
          <View className="flex-row items-center gap-2 mt-2">
            {/* Role Badge */}
            {user?.role && (
              <View className="bg-secondary px-3.5 py-1.5 rounded-full border border-outline flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="briefcase-outline" size={14} color="#0B57D0" />
                <Text className="text-label-medium text-on-secondary font-bold capitalize">
                  {user.role}
                </Text>
              </View>
            )}

            {/* Verification Badge */}
            <View
              className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                user?.isVerified ? "bg-success" : "bg-warning"
              }`}
            >
              <MaterialCommunityIcons
                name={user?.isVerified ? "check-decagram" : "clock-outline"}
                size={14}
                color="#FFFFFF"
              />
              <Text className="text-label-medium text-on-primary font-bold">
                {user?.isVerified ? "Verified" : "Pending Verification"}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Details Section */}
        <View className="bg-surface border border-outline rounded-3xl p-6 gap-4">
          <Text className="text-title-medium font-bold text-on-surface border-b border-outline pb-3">
            Account Details
          </Text>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">First Name</Text>
            <Text className="text-body-medium text-on-surface font-medium">
              {user?.firstName || "Not provided"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Last Name</Text>
            <Text className="text-body-medium text-on-surface font-medium">
              {user?.lastName || "Not provided"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Email</Text>
            <Text className="text-body-medium text-on-surface font-medium">
              {user?.email}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Role</Text>
            <Text className="text-body-medium text-on-surface font-medium capitalize">
              {user?.role || "Not assigned"}
            </Text>
          </View>
        </View>

        {/* Log Out Action */}
        <View className="mt-2">
          <Button
            label="Log Out"
            onPress={handleLogout}
            loading={isLoading}
            variant="secondary"
            className="w-full border-error active:bg-error/10"
            textClassName="text-error"
          />
        </View>
      </View>
    </ScrollView>
  );
}
