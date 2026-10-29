import React from "react";
import { Pressable, View } from "react-native";
import type { QueueWorker } from "@/src/services/verificationService";
import { Text } from "@/components/ui/Text";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { initialsOf } from "@/src/lib/utils";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const chipFor = (w: QueueWorker): { label: string; tone: StatusTone } =>
  w.status === "verified"
    ? { label: "Verified", tone: "success" }
    : w.status === "rejected"
      ? { label: "Rejected", tone: "error" }
      : { label: `${w.pendingCount} to review`, tone: "warning" };

// Worker list item (Figma 255:2973): verification queue row. Sits inside a Panel, which draws the dividers.
export function WorkerListItem({ worker, onPress }: { worker: QueueWorker; onPress: () => void }) {
  const chip = chipFor(worker);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${worker.name}, ${worker.role}, ${chip.label}`}
      className="flex-row items-center gap-4 p-4 active:bg-on-surface/5"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
        <Text variant="title-small">{initialsOf(worker.name)}</Text>
      </View>
      <View className="flex-1">
        <Text variant="body-large" numberOfLines={1}>{worker.name}</Text>
        <Text variant="body-small" color="on-surface-variant" numberOfLines={1}>{`${capitalize(worker.role)}, ${worker.email}`}</Text>
      </View>
      <StatusChip label={chip.label} tone={chip.tone} showIcon={false} />
    </Pressable>
  );
}
