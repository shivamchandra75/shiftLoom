import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useAuthStore } from "@/src/store/useAuthStore";
import { colors } from "@/src/theme/tokens";
import {
  ALLOWED_DOC_TYPES,
  checkPickedFile,
  DOC_LABELS,
  DocType,
  fetchMyDocuments,
  PickedFile,
  REQUIRED_DOCS,
  requestVerification,
  submitDocument,
  UserDocument,
} from "@/src/services/documentService";
import { Screen, BottomActionBar } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/Dialog";
import { Result } from "@/components/ui/Result";
import { DocumentUploadCard, formatSize, onFileChip } from "@/components/DocumentUploadCard";
import { DocumentPreviewModal, PreviewableDocument } from "@/components/DocumentPreviewModal";
import { StatusChip } from "@/components/ui/Chip";
import { formatDayMonth } from "@/src/lib/utils";

export default function DocumentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const required = user?.role && user.role !== "admin" ? REQUIRED_DOCS[user.role] : [];

  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [picked, setPicked] = useState<Partial<Record<DocType, PickedFile>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocType, string>>>({});
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "failure" | null>(null);
  const [removing, setRemoving] = useState<DocType | null>(null);
  const [previewing, setPreviewing] = useState<{ type: DocType; staged: boolean } | null>(null);

  const load = useCallback(() => {
    if (!user?.id) return;
    setIsLoading(true);
    setLoadError("");
    fetchMyDocuments(user.id)
      .then(setDocs)
      .catch((e) => setLoadError(e?.message || "Couldn't load your documents."))
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  useEffect(load, [load]);

  const byType = new Map(docs.map((d) => [d.docType, d]));

  const pickFile = async (type: DocType) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_DOC_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file: PickedFile = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType === "image/jpg" ? "image/jpeg" : asset.mimeType ?? "", // some Android pickers report image/jpg
      size: asset.size ?? new File(asset.uri).size, // size can be missing on some providers
    };
    const problem = checkPickedFile(file);
    setFileErrors((e) => ({ ...e, [type]: problem ?? undefined }));
    setPicked((p) => {
      const next = { ...p };
      if (problem) delete next[type];
      else next[type] = file;
      return next;
    });
  };

  const removeFile = (type: DocType) => {
    setPicked((p) => {
      const next = { ...p };
      delete next[type];
      return next;
    });
    setFileErrors((e) => ({ ...e, [type]: undefined }));
    setRemoving(null);
  };

  // Every required document must be either picked now or already on file (and not rejected)
  const missing = required.filter((t) => !picked[t] && (!byType.has(t) || byType.get(t)!.status === "rejected"));
  const stagedTypes = required.filter((t) => picked[t]);
  const canSubmit = !isSubmitting && stagedTypes.length > 0 && missing.length === 0;

  const handleSubmit = async () => {
    if (!user?.id || !canSubmit) return;
    setIsSubmitting(true);
    const failed: Partial<Record<DocType, string>> = {};
    for (const type of stagedTypes) {
      setUploading(type);
      try {
        await submitDocument(user.id, type, picked[type]!);
        setPicked((p) => {
          const next = { ...p };
          delete next[type];
          return next;
        });
      } catch (e: any) {
        failed[type] = e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || "Upload failed. Try again.";
      }
    }
    setUploading(null);
    setFileErrors(failed);

    if (Object.keys(failed).length === 0) {
      try {
        await requestVerification(user.id);
        setOutcome("success");
      } catch {
        setOutcome("failure");
      }
    } else {
      setOutcome("failure");
    }
    setIsSubmitting(false);
    load();
  };

  if (outcome) {
    return (
      <Screen className="justify-center px-4">
        {outcome === "success" ? (
          <Result
            status="success"
            title="Documents sent for verification"
            body="An admin will review them, usually within a day. You can follow each document on your Profile."
            primaryLabel="View status"
            onPrimary={() => router.replace("/(tabs)/profile")}
            secondaryLabel="Done"
            onSecondary={() => router.back()}
          />
        ) : (
          <Result
            status="failure"
            title="Upload didn't go through"
            body="Your files are still selected. Check your connection and try again."
            primaryLabel="Try again"
            onPrimary={() => {
              setOutcome(null);
              handleSubmit();
            }}
            secondaryLabel="Go back"
            onSecondary={() => setOutcome(null)}
          />
        )}
      </Screen>
    );
  }

  const removingFile = removing ? picked[removing] : undefined;

  // Before sending: the file picked on this device. After upload: the stored copy.
  const previewStaged = previewing?.staged ? picked[previewing.type] : undefined;
  const previewOnFile = previewing && !previewing.staged ? byType.get(previewing.type) : undefined;
  const previewDoc: PreviewableDocument | null = previewing && previewStaged
    ? {
        id: `local-${previewing.type}`,
        title: DOC_LABELS[previewing.type],
        fileName: previewStaged.name,
        filePath: "",
        mimeType: previewStaged.mimeType,
        localUri: previewStaged.uri,
        subtitle: `${previewStaged.name}, ${formatSize(previewStaged.size)}, not sent yet`,
      }
    : previewing && previewOnFile
      ? {
          id: previewOnFile.id,
          title: DOC_LABELS[previewing.type],
          fileName: previewOnFile.fileName,
          filePath: previewOnFile.filePath,
          mimeType: previewOnFile.mimeType,
          subtitle: `${previewOnFile.fileName}, uploaded ${formatDayMonth(previewOnFile.updatedAt)}`,
        }
      : null;
  const previewChip = previewOnFile ? onFileChip(previewOnFile.status) : null;

  return (
    <Screen>
      <TopAppBarSmall title="Upload documents" />
      {isLoading && docs.length === 0 ? (
        <ActivityIndicator className="py-12" color={colors.primary} />
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-4 pt-2 pb-32">
          <Text variant="body-medium" color="on-surface-variant">
            {`Upload these for your ${user?.role ?? ""} role. PDF, JPG or PNG, up to 5 MB each.`}
          </Text>

          {!!loadError && (
            <View className="flex-row items-center gap-3 rounded-md bg-error-container py-2 pl-4 pr-2">
              <Icon name="error" size={20} color="on-error-container" />
              <Text variant="body-medium" color="on-error-container" className="flex-1">{loadError}</Text>
              <Button variant="text" label="Retry" onPress={load} />
            </View>
          )}

          {required.map((type) => (
            <DocumentUploadCard
              key={type}
              label={DOC_LABELS[type]}
              onFile={byType.get(type)}
              staged={picked[type]}
              error={fileErrors[type]}
              uploading={uploading === type}
              disabled={isSubmitting}
              onChoose={() => pickFile(type)}
              onRemove={() => setRemoving(type)}
              onPreviewStaged={() => setPreviewing({ type, staged: true })}
              onPreviewOnFile={() => setPreviewing({ type, staged: false })}
            />
          ))}
        </ScrollView>
      )}

      <BottomActionBar>
        <View className="flex-1 gap-2">
          {missing.length > 0 && (
            <Text variant="body-small" color="on-surface-variant" className="text-center">
              {`Add ${missing.length} more ${missing.length === 1 ? "document" : "documents"} to submit`}
            </Text>
          )}
          <Button
            label={isSubmitting ? "Submitting…" : "Submit for verification"}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            className="w-full"
          />
        </View>
      </BottomActionBar>

      <Dialog
        visible={!!removing}
        icon="delete"
        tone="error"
        title="Remove this file?"
        body={`${removingFile?.name ?? "This file"} will be removed. You can choose another file after.`}
        confirmLabel="Remove"
        onConfirm={() => removing && removeFile(removing)}
        onDismiss={() => setRemoving(null)}
      />

      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewing(null)}
        status={previewChip ? <StatusChip label={previewChip.label} tone={previewChip.tone} showIcon={previewChip.icon} /> : undefined}
        onChooseAnother={
          previewStaged
            ? () => {
                const type = previewing!.type;
                setPreviewing(null);
                pickFile(type);
              }
            : undefined
        }
        onKeep={previewStaged ? () => setPreviewing(null) : undefined}
      />
    </Screen>
  );
}
