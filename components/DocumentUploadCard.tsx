import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { colors } from "@/src/theme/tokens";
import type { PickedFile, UserDocument } from "@/src/services/documentService";
import { formatDayMonth } from "@/src/lib/utils";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import { StatusChip, StatusTone } from "@/components/ui/Chip";

export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// Error chip label from the message checkPickedFile / the upload returned
const errorLabel = (msg: string) => (msg.includes("limit") ? "Too large" : msg.includes("PDF, JPG or PNG") ? "Wrong format" : "Not sent");

export type DocChip = { label: string; tone: StatusTone; icon: boolean };

export function onFileChip(status?: UserDocument["status"]): DocChip {
  if (status === "verified") return { label: "Verified", tone: "success", icon: true };
  if (status === "pending") return { label: "In review", tone: "warning", icon: true };
  if (status === "rejected") return { label: "Rejected", tone: "error", icon: true };
  return { label: "Not uploaded", tone: "neutral", icon: false };
}

// File row: tap it (or the eye) to preview. Remove only for files not sent yet.
function FileRow({ name, meta, mimeType, uploading, disabled, onPreview, onRemove }: {
  name: string; meta: string; mimeType: string; uploading?: boolean; disabled?: boolean; onPreview: () => void; onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onPreview}
      accessibilityRole="button"
      accessibilityLabel={`Preview ${name}`}
      className="flex-row items-center gap-3 rounded-md bg-surface-container py-1 pl-3 pr-1 active:opacity-80"
    >
      <Icon name={mimeType === "application/pdf" ? "picture_as_pdf" : "image"} size={20} />
      <Text variant="body-medium" numberOfLines={1} className="flex-1">{name}</Text>
      <Text variant="body-small" color="on-surface-variant">{meta}</Text>
      <IconButton icon="visibility" size={20} accessibilityLabel={`Preview ${name}`} onPress={onPreview} />
      {onRemove &&
        (uploading ? (
          <View className="h-10 w-10 items-center justify-center">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <IconButton icon="close" size={20} accessibilityLabel={`Remove ${name}`} onPress={onRemove} disabled={disabled} />
        ))}
    </Pressable>
  );
}

// Document upload card (Figma 239:2785): Not uploaded, File selected, File too large, In review,
// Verified (locked) and Rejected. Every file row previews the file: the picked one before sending,
// the stored copy after upload.
export function DocumentUploadCard({
  label,
  onFile,
  staged,
  error,
  uploading,
  disabled,
  onChoose,
  onRemove,
  onPreviewStaged,
  onPreviewOnFile,
}: {
  label: string;
  onFile?: UserDocument;
  staged?: PickedFile;
  error?: string;
  uploading: boolean;
  disabled: boolean;
  onChoose: () => void;
  onRemove: () => void;
  onPreviewStaged: () => void;
  onPreviewOnFile: () => void;
}) {
  const status = onFile?.status;
  const chip: DocChip = error
    ? { label: errorLabel(error), tone: "error", icon: true }
    : staged
      ? { label: "Ready to send", tone: "neutral", icon: false }
      : onFileChip(status);

  // A staged file is changed with its remove button; an upload that failed is retried with Submit.
  const action = staged || (status === "verified" && !error)
    ? null
    : error
      ? { variant: "tonal" as const, label: "Choose another file" }
      : status === "pending"
        ? { variant: "text" as const, label: "Replace file" }
        : status === "rejected"
          ? { variant: "tonal" as const, label: "Choose new file" }
          : { variant: "tonal" as const, label: "Choose file" };

  return (
    <View className="gap-3 rounded-xl bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <Text variant="title-medium" className="flex-1">{label}</Text>
        <StatusChip label={chip.label} tone={chip.tone} showIcon={chip.icon} />
      </View>

      {staged ? (
        <FileRow
          name={staged.name}
          meta={formatSize(staged.size)}
          mimeType={staged.mimeType}
          uploading={uploading}
          disabled={disabled}
          onPreview={onPreviewStaged}
          onRemove={onRemove}
        />
      ) : onFile ? (
        <FileRow name={onFile.fileName} meta={`Uploaded ${formatDayMonth(onFile.updatedAt)}`} mimeType={onFile.mimeType} onPreview={onPreviewOnFile} />
      ) : null}
      {status === "rejected" && !staged && !!onFile?.rejectionReason && (
        <Text variant="body-small" color="error">{onFile.rejectionReason}</Text>
      )}
      {!!error && <Text variant="body-small" color="error">{error}</Text>}

      {action && (
        <Button
          variant={action.variant}
          label={action.label}
          leadingIcon="attach_file"
          onPress={onChoose}
          disabled={disabled}
          className="self-start"
          accessibilityLabel={`${action.label} for ${label}`}
        />
      )}
    </View>
  );
}
