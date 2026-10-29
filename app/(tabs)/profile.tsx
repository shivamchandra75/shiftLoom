import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/useAuthStore";
import { colors } from "@/src/theme/tokens";
import {
  DOC_LABELS,
  fetchMyDocuments,
  REQUIRED_DOCS,
  summarizeVerification,
  UserDocument,
  VerificationSummary,
} from "@/src/services/documentService";
import { Screen } from "@/components/ui/Screen";
import { TopAppBarLarge } from "@/components/ui/TopAppBar";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { ListItem, Panel, Subheader } from "@/components/ui/ListItem";
import { Dialog } from "@/components/ui/Dialog";

const SUMMARY: Record<VerificationSummary, { label: string; tone: StatusTone }> = {
  verified: { label: "Verified", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Action needed", tone: "error" },
  incomplete: { label: "Incomplete", tone: "warning" },
  not_submitted: { label: "Not verified", tone: "warning" },
};

const DOC_CHIP: Record<UserDocument["status"], { label: string; tone: StatusTone }> = {
  verified: { label: "Verified", tone: "success" },
  pending: { label: "In review", tone: "warning" },
  rejected: { label: "Rejected", tone: "error" },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuthStore();
  const isWorker = !!user?.role && user.role !== "admin";
  const required = isWorker ? REQUIRED_DOCS[user.role as keyof typeof REQUIRED_DOCS] : [];
  const [docs, setDocs] = useState<UserDocument[] | null>(null);
  const [docsError, setDocsError] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Refresh whenever the tab is shown, e.g. right after submitting documents
  useFocusEffect(
    useCallback(() => {
      if (!isWorker || !user?.id) return;
      fetchMyDocuments(user.id)
        .then((d) => {
          setDocs(d);
          setDocsError("");
        })
        .catch((e) => setDocsError(e?.message || "Couldn't load your documents."));
    }, [isWorker, user?.id])
  );

  const summary = docs ? summarizeVerification(required, docs, !!user?.isVerified) : user?.isVerified ? "verified" : null;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile";
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || "U";

  return (
    <Screen>
      <TopAppBarLarge title="Profile" />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-6 pt-2">
        <View className="flex-row items-center gap-4 rounded-xl bg-surface px-4 py-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <Text variant="title-large">{initials}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text variant="title-large">{fullName}</Text>
            <Text variant="body-medium" color="on-surface-variant">{user?.email}</Text>
            <View className="flex-row flex-wrap gap-2 pt-1">
              {user?.role && <StatusChip label={capitalize(user.role)} tone="neutral" showIcon={false} />}
              {isWorker && summary && <StatusChip label={SUMMARY[summary].label} tone={SUMMARY[summary].tone} />}
            </View>
          </View>
        </View>

        {isWorker && (
          <>
            <Subheader label="Verification" />
            {!!docsError && <Text variant="body-small" color="error" className="px-1">{docsError}</Text>}
            {!docs && !docsError ? (
              <ActivityIndicator className="py-6" color={colors.primary} />
            ) : summary === "not_submitted" ? (
              <View className="gap-3 rounded-xl bg-surface px-4 py-5">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-warning-container">
                  <Icon name="upload_file" color="on-warning-container" />
                </View>
                <Text variant="title-medium">Upload your documents to start applying</Text>
                <Text variant="body-medium" color="on-surface-variant">
                  {`${capitalize(user!.role!)} shifts need ${required.length} documents: ${required.map((t) => DOC_LABELS[t].toLowerCase()).join(", ")}. PDF, JPG or PNG.`}
                </Text>
                <Button label="Upload documents" onPress={() => router.push("/documents")} className="self-start" />
              </View>
            ) : docs ? (
              <Panel>
                {required.map((type) => {
                  const doc = docs.find((d) => d.docType === type);
                  const chip = doc ? DOC_CHIP[doc.status] : null;
                  return (
                    <ListItem
                      key={type}
                      leadingIcon="badge"
                      headline={DOC_LABELS[type]}
                      supportingText={doc?.status === "rejected" ? doc.rejectionReason ?? undefined : undefined}
                      trailing={chip ? <StatusChip label={chip.label} tone={chip.tone} /> : <StatusChip label="Not uploaded" tone="neutral" showIcon={false} />}
                    />
                  );
                })}
                {summary !== "verified" && (
                  <ListItem leadingIcon="upload_file" headline="Upload documents" trailingIcon="chevron_right" onPress={() => router.push("/documents")} />
                )}
              </Panel>
            ) : null}
          </>
        )}

        <Subheader label="Account" />
        <Panel>
          <ListItem leadingIcon="logout" headline="Log out" onPress={() => setConfirmLogout(true)} />
        </Panel>
      </ScrollView>

      <Dialog
        visible={confirmLogout}
        icon="logout"
        title="Log out?"
        body="You'll need to sign in again to see your shifts."
        confirmLabel="Log out"
        onConfirm={logout}
        onDismiss={() => setConfirmLogout(false)}
        loading={isLoading}
      />
    </Screen>
  );
}
