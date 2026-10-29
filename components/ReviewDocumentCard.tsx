import React from "react";
import { View } from "react-native";
import type { ReviewDocument } from "@/src/services/verificationService";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { formatSize } from "@/components/DocumentUploadCard";
import { formatDayMonth } from "@/src/lib/utils";

const CHIP: Record<ReviewDocument["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "To review", tone: "warning" },
  verified: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

// Review document card (Figma 255:3036): one document of a worker. Reject asks for a reason in a bottom
// sheet. Approved documents are done, and rejected ones wait for the worker to upload a new file.
export function ReviewDocumentCard({
  label,
  doc,
  busy,
  disabled,
  onPreview,
  onApprove,
  onReject,
}: {
  label: string;
  doc?: ReviewDocument;
  /** This card's decision is being saved. */
  busy: boolean;
  /** Another decision is being saved. */
  disabled: boolean;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!doc) {
    return (
      <View className="gap-3 rounded-xl bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <Text variant="title-medium" className="flex-1">{label}</Text>
          <StatusChip label="Not uploaded" tone="neutral" showIcon={false} />
        </View>
        <Text variant="body-small" color="on-surface-variant">The worker has not uploaded this yet.</Text>
      </View>
    );
  }

  const chip = CHIP[doc.status];
  return (
    <View className="gap-3 rounded-xl bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <Text variant="title-medium" className="flex-1">{label}</Text>
        <StatusChip label={chip.label} tone={chip.tone} />
      </View>
      <View className="flex-row items-center gap-3 rounded-md bg-surface-container py-2 pl-3 pr-1">
        <Icon name={doc.mimeType === "application/pdf" ? "picture_as_pdf" : "image"} />
        <View className="flex-1">
          <Text variant="body-medium" numberOfLines={1}>{doc.fileName}</Text>
          <Text variant="body-small" color="on-surface-variant">{`${formatSize(doc.sizeBytes)}, uploaded ${formatDayMonth(doc.updatedAt)}`}</Text>
        </View>
        <IconButton icon="visibility" size={22} accessibilityLabel={`Preview ${label}`} onPress={onPreview} />
      </View>
      {doc.status === "rejected" && !!doc.rejectionReason && <Text variant="body-small" color="error">{`Reason: ${doc.rejectionReason}`}</Text>}
      {doc.status === "pending" && (
        <View className="flex-row gap-2">
          <Button variant="outlined" tone="error" label="Reject" onPress={onReject} disabled={disabled || busy} className="flex-1" />
          <Button label="Approve" onPress={onApprove} loading={busy} disabled={disabled} className="flex-1" />
        </View>
      )}
    </View>
  );
}
