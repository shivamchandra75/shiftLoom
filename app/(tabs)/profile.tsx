import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  DOC_LABELS,
  fetchMyDocuments,
  REQUIRED_DOCS,
  summarizeVerification,
  UserDocument,
  VerificationSummary,
} from "@/src/services/documentService";

const SUMMARY: Record<VerificationSummary, { label: string; hint: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string }> = {
  verified: { label: "Verified", hint: "You can accept shifts.", icon: "check-decagram", bg: "bg-success" },
  pending: { label: "In review", hint: "An admin is reviewing your documents.", icon: "clock-outline", bg: "bg-primary" },
  rejected: { label: "Action needed", hint: "A document was rejected. Re-upload it to continue.", icon: "alert-circle-outline", bg: "bg-error" },
  incomplete: { label: "Incomplete", hint: "Some required documents are missing.", icon: "file-alert-outline", bg: "bg-warning" },
  not_submitted: { label: "Not submitted", hint: "Upload your documents to start accepting shifts.", icon: "file-upload-outline", bg: "bg-warning" },
};

const DOC_STATUS_COLOR = { pending: "#0B57D0", verified: "#146C2E", rejected: "#B3261E" } as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const isWorker = !!user?.role && user.role !== "admin";
  const required = isWorker ? REQUIRED_DOCS[user.role as keyof typeof REQUIRED_DOCS] : [];
  const [docs, setDocs] = useState<UserDocument[] | null>(null);
  const [docsError, setDocsError] = useState("");

  // Refresh whenever the tab is shown, e.g. right after submitting documents
  useFocusEffect(
    useCallback(() => {
      if (!isWorker || !user?.id) return;
      fetchMyDocuments(user.id)
        .then((d) => {
          setDocs(d);
          setDocsError("");
        })
        .catch((e) => setDocsError(e?.message || "Couldn't load documents."));
    }, [isWorker, user?.id])
  );

  const summary = docs ? summarizeVerification(required, docs, !!user?.isVerified) : user?.isVerified ? "verified" : null;

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
            {summary && (
              <View className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${SUMMARY[summary].bg}`}>
                <MaterialCommunityIcons name={SUMMARY[summary].icon} size={14} color="#FFFFFF" />
                <Text className="text-label-medium text-on-primary font-bold">{SUMMARY[summary].label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Verification documents (workers only) */}
        {isWorker && (
          <View className="bg-surface border border-outline rounded-3xl p-6 gap-4">
            <View className="border-b border-outline pb-3 gap-1">
              <Text className="text-title-medium font-bold text-on-surface">Verification</Text>
              {summary && <Text className="text-body-medium text-on-surface-variant">{SUMMARY[summary].hint}</Text>}
            </View>

            {!!docsError && <Text className="text-body-small text-error">{docsError}</Text>}
            {required.map((type) => {
              const doc = docs?.find((d) => d.docType === type);
              return (
                <View key={type} className="flex-row justify-between items-center gap-3">
                  <Text className="flex-1 text-body-medium text-on-surface">{DOC_LABELS[type]}</Text>
                  <Text
                    className="text-label-medium font-bold capitalize"
                    style={{ color: doc ? DOC_STATUS_COLOR[doc.status] : "#444746" }}
                  >
                    {doc ? (doc.status === "pending" ? "In review" : doc.status) : "Not uploaded"}
                  </Text>
                </View>
              );
            })}

            {summary !== "verified" && (
              <Pressable
                onPress={() => router.push("/documents")}
                accessibilityRole="button"
                className="flex-row items-center justify-center gap-2 py-3 rounded-full bg-primary active:opacity-90"
              >
                <MaterialCommunityIcons name="file-upload-outline" size={18} color="#FFFFFF" />
                <Text className="text-label-large font-bold text-on-primary">
                  {summary === "not_submitted" ? "Upload documents" : "Manage documents"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

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
            variant="outlined"
            tone="error"
            className="w-full"
          />
        </View>
      </View>
    </ScrollView>
  );
}
