import React from "react";
import { Pressable, View } from "react-native";
import type { Job } from "@/src/services/jobService";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { ShiftDateTile } from "@/components/ShiftDateTile";
import { formatInr, formatTimeRange } from "@/src/lib/utils";

export type ShiftStatus = "accepted" | "completed" | "cancelled";

const STATUS: Record<ShiftStatus, { label: string; tone: StatusTone; unit: string }> = {
  accepted: { label: "Accepted", tone: "success", unit: "per shift" },
  completed: { label: "Completed", tone: "neutral", unit: "earned" },
  cancelled: { label: "Cancelled", tone: "error", unit: "per shift" },
};

// Shift list item (Figma 230:2569): My shifts. Cancelled is dimmed.
export function ShiftListItem({ job, wage, status, onPress }: { job: Job; wage: number; status: ShiftStatus; onPress: () => void }) {
  const s = STATUS[status];
  const dimmed = status === "cancelled";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.companyName}, ${s.label}`}
      className="flex-row items-center gap-4 rounded-xl bg-surface p-4 active:opacity-90"
    >
      <ShiftDateTile date={job.date} dimmed={dimmed} />
      <View className="flex-1 gap-1">
        <Text variant="title-medium" color={dimmed ? "on-surface-variant" : "on-surface"} numberOfLines={1}>{job.companyName}</Text>
        <View className="flex-row items-center gap-1">
          <Icon name="schedule" size={16} />
          <Text variant="body-medium" color="on-surface-variant" numberOfLines={1} className="flex-1">{formatTimeRange(job.startTime, job.endTime)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Icon name="location_on" size={16} />
          <Text variant="body-medium" color="on-surface-variant" numberOfLines={1} className="flex-1">{job.locationAddress}</Text>
        </View>
      </View>
      <View className="items-end gap-2">
        <StatusChip label={s.label} tone={s.tone} showIcon={false} />
        <View className="items-end">
          <Text variant="title-medium" color={dimmed ? "on-surface-variant" : "on-surface"}>{formatInr(wage)}</Text>
          <Text variant="body-small" color="on-surface-variant">{s.unit}</Text>
        </View>
      </View>
    </Pressable>
  );
}
