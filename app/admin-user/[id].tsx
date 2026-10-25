import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Snackbar, SnackbarMessage } from "@/components/ui/snackbar";
import { RejectReasonModal } from "@/components/RejectReasonModal";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { getFormattedDate } from "@/src/lib/utils";
import { DOC_LABELS, DocType, REQUIRED_DOCS } from "@/src/services/documentService";
import {
  fetchWorkerForReview,
  reviewDocuments,
  ReviewDocument,
  ReviewWorker,
  VerificationStatus,
} from "@/src/services/verificationService";

const DOC_CHIP = {
  pending: { label: "To review", icon: "clock-outline", color: "#0B57D0" },
  verified: { label: "Approved", icon: "check-decagram", color: "#146C2E" },
  rejected: { label: "Rejected", icon: "close-octagon-outline", color: "#B3261E" },
} as const;

const ACCOUNT_CHIP: Record<VerificationStatus, { label: string; bg: string }> = {
  pending: { label: "Pending review", bg: "bg-primary" },
  verified: { label: "Verified", bg: "bg-success" },
  rejected: { label: "Rejected", bg: "bg-error" },
};

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const friendlyError = (e: any, fallback: string) =>
  e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || fallback;

export default function ReviewWorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [worker, setWorker] = useState<ReviewWorker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyDocId, setBusyDocId] = useState<string | null>(null); // doc id, or "all"
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
    setBusyDocId(docs.length > 1 ? "all" : docs[0].id);
    try {
      const accountStatus = await reviewDocuments(docs.map((d) => d.id), status, reason);
      const what = docs.length > 1 ? `${docs.length} documents` : DOC_LABELS[docs[0].docType];
      const text =
        status === "rejected"
          ? `${what} rejected. The worker will see your reason.`
          : accountStatus === "verified"
            ? `${what} approved. ${worker?.name} is now verified.`
            : `${what} approved.`;
      setRejecting(null);
      setSnack({ tone: "success", text });
      load();
    } catch (e) {
      setSnack({ tone: "error", text: friendlyError(e, "Couldn't save your decision. Try again.") });
    } finally {
      setBusyDocId(null);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!worker) {
    return (
      <View className="flex-1 bg-background items-center justify-center gap-3 px-6">
        <Text className="text-body-medium text-error text-center">{loadError || "Worker not found."}</Text>
        <Pressable onPress={load}>
          <Text className="text-label-large text-primary font-bold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const required: DocType[] = REQUIRED_DOCS[worker.role] ?? [];
  const byType = new Map(worker.documents.map((d) => [d.docType, d]));
  // Required documents first (including missing ones), then anything else they uploaded, e.g. before a role change
  const rows = [...required, ...worker.documents.map((d) => d.docType).filter((t) => !required.includes(t))];
  const pendingDocs = worker.documents.filter((d) => d.status === "pending");
  const busy = busyDocId !== null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-6 gap-4" contentContainerStyle={{ paddingBottom: pendingDocs.length > 1 ? 120 : 32 }}>
        {/* Worker header */}
        <View className="bg-surface border border-outline rounded-3xl p-5 flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
            <Text className="text-title-large font-bold text-on-primary">{worker.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-title-medium font-bold text-on-surface" numberOfLines={1}>{worker.name}</Text>
            <Text className="text-body-small text-on-surface-variant" numberOfLines={1}>{worker.email}</Text>
            <View className="flex-row gap-2 mt-1">
              <View className="bg-secondary px-2.5 py-0.5 rounded-full">
                <Text className="text-label-small font-bold text-on-secondary capitalize">{worker.role}</Text>
              </View>
              <View className={`px-2.5 py-0.5 rounded-full ${ACCOUNT_CHIP[worker.status].bg}`}>
                <Text className="text-label-small font-bold text-on-primary">{ACCOUNT_CHIP[worker.status].label}</Text>
              </View>
            </View>
          </View>
        </View>

        {!!loadError && <Text className="text-body-small text-error">{loadError}</Text>}

        <Text className="text-title-medium font-bold text-on-surface mt-2">Documents</Text>

        {rows.map((type) => {
          const doc = byType.get(type);
          const isRequired = required.includes(type);

          if (!doc) {
            return (
              <View key={type} className="border border-dashed border-outline-variant rounded-2xl p-4 flex-row items-center gap-3">
                <MaterialCommunityIcons name="file-question-outline" size={22} color="#747775" />
                <View className="flex-1">
                  <Text className="text-title-small font-bold text-on-surface">{DOC_LABELS[type]}</Text>
                  <Text className="text-body-small text-on-surface-variant">Not uploaded yet</Text>
                </View>
              </View>
            );
          }

          const chip = DOC_CHIP[doc.status];
          const isBusy = busyDocId === doc.id || busyDocId === "all";
          return (
            <View key={type} className="bg-surface border border-outline rounded-2xl p-4 gap-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-title-small font-bold text-on-surface">{DOC_LABELS[type]}</Text>
                  {!isRequired && <Text className="text-label-small text-on-surface-variant">Not required for this role</Text>}
                </View>
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons name={chip.icon} size={16} color={chip.color} />
                  <Text className="text-label-medium font-bold" style={{ color: chip.color }}>{chip.label}</Text>
                </View>
              </View>

              {/* File row: tap to preview inside the app */}
              <Pressable
                onPress={() => setPreviewing(doc)}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${DOC_LABELS[type]}`}
                className="flex-row items-center gap-3 bg-surface-variant rounded-xl px-3 py-3 active:opacity-70"
              >
                <MaterialCommunityIcons name={doc.mimeType === "application/pdf" ? "file-pdf-box" : "file-image-outline"} size={24} color="#444746" />
                <View className="flex-1">
                  <Text className="text-body-medium text-on-surface" numberOfLines={1}>{doc.fileName}</Text>
                  <Text className="text-label-small text-on-surface-variant">
                    {formatSize(doc.sizeBytes)} · {getFormattedDate(doc.updatedAt)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="eye-outline" size={20} color="#0B57D0" />
              </Pressable>

              {doc.status === "rejected" && !!doc.rejectionReason && (
                <Text className="text-body-small text-error">Reason: {doc.rejectionReason}</Text>
              )}

              <View className="flex-row gap-3">
                {doc.status !== "rejected" && (
                  <Pressable
                    onPress={() => setRejecting(doc)}
                    disabled={busy}
                    accessibilityRole="button"
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full border ${busy ? "border-outline opacity-50" : "border-error active:bg-error/10"}`}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#B3261E" />
                    <Text className="text-label-large font-bold text-error">Reject</Text>
                  </Pressable>
                )}
                {doc.status !== "verified" && (
                  <Pressable
                    onPress={() => review([doc], "verified")}
                    disabled={busy}
                    accessibilityRole="button"
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full ${busy ? "bg-surface-variant" : "bg-primary active:opacity-90"}`}
                  >
                    {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="check" size={18} color={busy ? "#747775" : "#FFFFFF"} />}
                    <Text className={`text-label-large font-bold ${busy ? "text-on-surface-variant" : "text-on-primary"}`}>Approve</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {pendingDocs.length > 1 && (
        <View className="absolute left-0 right-0 bottom-0 px-6 pt-3 border-t border-outline bg-background" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable
            onPress={() => review(pendingDocs, "verified")}
            disabled={busy}
            accessibilityRole="button"
            className={`flex-row items-center justify-center gap-2 py-3.5 rounded-full ${busy ? "bg-surface-variant" : "bg-primary active:opacity-90"}`}
          >
            {busyDocId === "all" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="check-all" size={20} color={busy ? "#747775" : "#FFFFFF"} />}
            <Text className={`text-label-large font-bold ${busy ? "text-on-surface-variant" : "text-on-primary"}`}>
              Approve all {pendingDocs.length} pending
            </Text>
          </Pressable>
        </View>
      )}

      <RejectReasonModal
        visible={!!rejecting}
        documentLabel={rejecting ? DOC_LABELS[rejecting.docType] : ""}
        isSubmitting={!!rejecting && busyDocId === rejecting.id}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => rejecting && review([rejecting], "rejected", reason)}
      />

      <DocumentPreviewModal
        doc={previewing && { id: previewing.id, title: DOC_LABELS[previewing.docType], fileName: previewing.fileName, filePath: previewing.filePath, mimeType: previewing.mimeType }}
        onClose={() => setPreviewing(null)}
      />

      <Snackbar message={snack} onHide={hideSnack} bottomOffset={pendingDocs.length > 1 ? 72 : 0} />
    </View>
  );
}
