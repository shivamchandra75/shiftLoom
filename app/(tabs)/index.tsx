import React from "react";
import { View, Text } from "@/src/tw";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import { ScrollView } from "@/src/tw";

export default function HomeScreen() {
  const { user, logout, isLoading } = useAuthStore();

  return (
    <ScrollView 
      className="flex-grow bg-background"
      contentContainerClassName="flex-grow px-6 py-12 justify-center"
    >
      <View className="gap-8 max-w-md w-full self-center">
        {/* Header Block */}
        <View className="items-center gap-2">
          <View className="w-20 h-20 bg-primary rounded-full items-center justify-center">
            <Text className="text-display-medium text-on-primary font-bold">
              {user?.fullName?.charAt(0) || "U"}
            </Text>
          </View>
          <Text className="text-headline-large text-on-background font-bold tracking-tight mt-2">
            Welcome Back!
          </Text>
          <Text className="text-body-large text-on-surface-variant text-center">
            Logged in as <Text className="font-semibold text-on-background">{user?.fullName}</Text>
          </Text>
        </View>

        {/* Profile Card */}
        <View className="bg-surface border border-outline rounded-3xl p-6 gap-4">
          <Text className="text-title-large text-on-surface font-bold border-b border-outline pb-2">
            Account Profile
          </Text>

          <View className="flex-row justify-between items-center">
            <Text className="text-body-medium text-on-surface-variant">Email</Text>
            <Text className="text-body-medium text-on-surface font-medium">{user?.email}</Text>
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
              className={`px-3 py-1 rounded-full ${
                user?.isVerified ? "bg-success" : "bg-warning"
              }`}
            >
              <Text className="text-label-medium text-on-primary font-bold">
                {user?.isVerified ? "Verified" : "Pending Verification"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View className="mt-4">
          <Button
            label="Log Out"
            onPress={logout}
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
