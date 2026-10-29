import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/tokens";
import { initialsOf } from "@/src/lib/utils";
import { DOC_LABELS, DocType, REQUIRED_DOCS } from "@/src/services/documentService";
import { fetchWorkerForReview, reviewDocuments, ReviewDocument, ReviewWorker, VerificationStatus } from "@/src/services/verificationService";
import { Screen, BottomActionBar } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { Subheader } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Snackbar, SnackbarMessage } from "@/components/ui/snackbar";
import { ReasonSheet } from "@/components/ReasonSheet";
import { ReviewDocumentCard } from "@/components/ReviewDocumentCard";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";

const REJECT_REASONS = ["Blurry or hard to read", "Wrong document", "Expired", "Name doesn't match the account", "Other"];

const ACCOUNT_CHIP: Record<VerificationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "In review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const friendlyError = (e: any, fallback: string) => (e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || fallback);

export default function ReviewWorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<ReviewWorker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // document id, or "all"
  const [previewing, setPreviewing] = useState<ReviewDocument | null>(null);
  const [rejecting, setRejecting] = useState<ReviewDocument | null>(null);
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);
  const hideSnack = useCallback(() => setSnack(null), []);

  const load = useCallback(() => {
    setLoadError("");
    fetchWorkerForReview(id)
      .then(setWorker)
      .catch((e) => setLoadError(friendlyError(e, "Couldn't load this worker.")))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const review = async (docs: ReviewDocument[], status: "verified" | "rejected", reason?: string) => {
    setBusy(docs.length > 1 ? "all" : docs[0].id);
    try {
      const accountStatus = await reviewDocuments(docs.map((d) => d.id), status, reason);
      const what = docs.length > 1 ? `${docs.length} documents` : DOC_LABELS[docs[0].docType].toLowerCase();
      setRejecting(null);
      setSnack({
        tone: "success",
        text:
          status === "rejected"
            ? `Rejected ${what}. ${worker?.name} will see your reason.`
            : accountStatus === "verified"
              ? `Approved ${what}. ${worker?.name} is now verified.`
              : `Approved ${what}.`,
      });
      load();
    } catch (e) {
      setRejecting(null);
      setSnack({ tone: "error", text: friendlyError(e, "Couldn't save your decision. Try again.") });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <TopAppBarSmall title="Review worker" />
        <ActivityIndicator className="py-12" color={colors.primary} />
      </Screen>
    );
  }

  if (!worker) {
    return (
      <Screen>
        <TopAppBarSmall title="Review worker" />
        <EmptyState icon="cloud_off" title="Couldn't load this worker" body={loadError || "Worker not found."} actionLabel="Try again" onAction={() => { setIsLoading(true); load(); }} />
      </Screen>
    );
  }

  const required: DocType[] = REQUIRED_DOCS[worker.role] ?? [];
  const byType = new Map(worker.documents.map((d) => [d.docType, d]));
  // Required documents first (including missing ones), then anything else they uploaded, e.g. before a role change
  const types = [...required, ...worker.documents.map((d) => d.docType).filter((t) => !required.includes(t))];
  const pending = worker.documents.filter((d) => d.status === "pending");
  const account = ACCOUNT_CHIP[worker.status];

  return (
    <Screen>
      <TopAppBarSmall title="Review worker" />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-32 pt-2">
        <View className="flex-row items-center gap-4 rounded-xl bg-surface px-4 py-5">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
            <Text variant="title-medium">{initialsOf(worker.name)}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text variant="title-large" accessibilityRole="header">{worker.name}</Text>
            <Text variant="body-medium" color="on-surface-variant">{worker.email}</Text>
            <View className="flex-row gap-2 pt-1">
              <StatusChip label={capitalize(worker.role)} tone="neutral" showIcon={false} />
              <StatusChip label={account.label} tone={account.tone} />
            </View>
          </View>
        </View>

        {!!loadError && <Text variant="body-small" color="error" className="px-1">{loadError}</Text>}

        <Subheader label="Documents" />
        {types.map((type) => (
          <ReviewDocumentCard
            key={type}
            label={DOC_LABELS[type]}
            doc={byType.get(type)}
            busy={busy === byType.get(type)?.id || busy === "all"}
            disabled={busy !== null}
            onPreview={() => setPreviewing(byType.get(type)!)}
            onApprove={() => review([byType.get(type)!], "verified")}
            onReject={() => setRejecting(byType.get(type)!)}
          />
        ))}
      </ScrollView>

      {pending.length > 1 && (
        <BottomActionBar>
          <Button
            label={`Approve ${pending.length} documents`}
            onPress={() => review(pending, "verified")}
            loading={busy === "all"}
            disabled={busy !== null}
            className="flex-1"
          />
        </BottomActionBar>
      )}

      <ReasonSheet
        visible={!!rejecting}
        onDismiss={() => setRejecting(null)}
        title="Reject this document?"
        supportingText={`${worker.name.split(" ")[0]} will see the reason and can upload a new file.`}
        reasons={REJECT_REASONS}
        dismissLabel="Cancel"
        confirmLabel="Reject"
        onConfirm={(reason) => rejecting && review([rejecting], "rejected", reason)}
        loading={!!rejecting && busy === rejecting.id}
      />

      <DocumentPreviewModal
        doc={previewing && { id: previewing.id, title: DOC_LABELS[previewing.docType], fileName: previewing.fileName, filePath: previewing.filePath, mimeType: previewing.mimeType }}
        onClose={() => setPreviewing(null)}
      />

      <Snackbar message={snack} onHide={hideSnack} bottomOffset={pending.length > 1 ? 88 : 0} />
    </Screen>
  );
}
