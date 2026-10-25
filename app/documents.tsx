import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useAuthStore } from "@/src/store/useAuthStore";
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

const STATUS_CHIP = {
  missing: { label: "Not uploaded", icon: "file-upload-outline", tone: "text-on-surface-variant", color: "#444746" },
  pending: { label: "In review", icon: "clock-outline", tone: "text-primary", color: "#0B57D0" },
  verified: { label: "Verified", icon: "check-decagram", tone: "text-success", color: "#146C2E" },
  rejected: { label: "Rejected", icon: "alert-circle-outline", tone: "text-error", color: "#B3261E" },
} as const;

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const required = user?.role && user.role !== "admin" ? REQUIRED_DOCS[user.role] : [];

  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [picked, setPicked] = useState<Partial<Record<DocType, PickedFile>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocType, string>>>({});
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
        setDone(true);
      } catch (e: any) {
        setLoadError(e?.message || "Documents uploaded, but we couldn't request verification. Try again.");
      }
    }
    setIsSubmitting(false);
    load();
  };

  if (done) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8 gap-4" style={{ paddingBottom: insets.bottom }}>
        <View className="w-20 h-20 rounded-full bg-success/15 items-center justify-center">
          <MaterialCommunityIcons name="check-circle" size={48} color="#146C2E" />
        </View>
        <Text className="text-headline-small font-bold text-on-surface text-center">Documents sent for verification</Text>
        <Text className="text-body-large text-on-surface-variant text-center">
          An admin will review them soon. You can view your status on the Profile tab.
        </Text>
        <View className="w-full gap-3 mt-4">
          <PrimaryButton label="View status" onPress={() => router.replace("/(tabs)/profile")} />
          <SecondaryButton label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (isLoading && docs.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-6 gap-4">
        <Text className="text-body-medium text-on-surface-variant">
          Upload these documents for your <Text className="font-bold capitalize">{user?.role}</Text> role. PDF, JPG or PNG, up to 5 MB each.
        </Text>

        {!!loadError && (
          <View className="flex-row items-center gap-2 bg-error/10 rounded-2xl p-4">
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#B3261E" />
            <Text className="flex-1 text-body-medium text-error">{loadError}</Text>
            <Pressable onPress={load} hitSlop={8}>
              <Text className="text-label-large font-bold text-primary">Retry</Text>
            </Pressable>
          </View>
        )}

        {required.map((type) => {
          const onFile = byType.get(type);
          const staged = picked[type];
          const chip = STATUS_CHIP[onFile?.status ?? "missing"];
          const locked = onFile?.status === "verified";
          const error = fileErrors[type];
          return (
            <View key={type} className={`bg-surface border rounded-2xl p-4 gap-3 ${error ? "border-error" : "border-outline"}`}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-title-small font-bold text-on-surface">{DOC_LABELS[type]}</Text>
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons name={chip.icon} size={16} color={chip.color} />
                  <Text className={`text-label-medium font-bold ${chip.tone}`}>{chip.label}</Text>
                </View>
              </View>

              {onFile && !staged && (
                <Text className="text-body-small text-on-surface-variant" numberOfLines={1}>On file: {onFile.fileName}</Text>
              )}
              {onFile?.status === "rejected" && !!onFile.rejectionReason && (
                <Text className="text-body-small text-error">Reason: {onFile.rejectionReason}</Text>
              )}
              {staged && (
                <View className="flex-row items-center gap-2 bg-surface-variant rounded-xl px-3 py-2">
                  <MaterialCommunityIcons name={staged.mimeType === "application/pdf" ? "file-pdf-box" : "file-image-outline"} size={20} color="#444746" />
                  <Text className="flex-1 text-body-small text-on-surface" numberOfLines={1}>{staged.name}</Text>
                  <Text className="text-body-small text-on-surface-variant">{formatSize(staged.size)}</Text>
                  {uploading === type && <ActivityIndicator size="small" />}
                </View>
              )}
              {!!error && <Text className="text-body-small text-error">{error}</Text>}

              {!locked && (
                <Pressable
                  onPress={() => pickFile(type)}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  className="flex-row items-center justify-center gap-2 py-2.5 rounded-full border border-outline active:bg-surface-variant"
                >
                  <MaterialCommunityIcons name="paperclip" size={18} color="#0B57D0" />
                  <Text className="text-label-large font-bold text-primary">{staged || onFile ? "Replace file" : "Choose file"}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View className="px-6 pt-3 border-t border-outline bg-background gap-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {missing.length > 0 && (
          <Text className="text-body-small text-on-surface-variant text-center">
            {missing.length} more {missing.length === 1 ? "document" : "documents"} needed
          </Text>
        )}
        <PrimaryButton
          label={isSubmitting ? "Uploading…" : "Submit for verification"}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
        />
      </View>
    </View>
  );
}
