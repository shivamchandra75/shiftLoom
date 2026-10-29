import React from "react";
import { Pressable, View } from "react-native";
import type { Job } from "@/src/services/jobService";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { StatusChip, StatusTone } from "@/components/ui/Chip";
import { ShiftDateTile } from "@/components/ShiftDateTile";
import { formatTimeRange } from "@/src/lib/utils";

export const jobSlots = (job: Job) => {
  const total = job.jobRoles.reduce((n, r) => n + r.totalSlots, 0);
  const filled = Math.min(job.filledSlots ?? 0, total);
  return { total, filled, open: total - filled };
};

// Chip for a job: cancelled/completed win, otherwise how many slots still need workers.
export function jobChip(job: Job): { label: string; tone: StatusTone } {
  if (job.status === "cancelled") return { label: "Cancelled", tone: "error" };
  if (job.status === "completed") return { label: "Completed", tone: "neutral" };
  const { open } = jobSlots(job);
  return open > 0 ? { label: `${open} open`, tone: "warning" } : { label: "Full", tone: "success" };
}

// Admin job item (Figma 255:2942): date tile, company, time, place, status chip and a fill progress bar.
export function AdminJobListItem({ job, onPress }: { job: Job; onPress: () => void }) {
  const { total, filled, open } = jobSlots(job);
  const chip = jobChip(job);
  const live = job.status === "open" || job.status === "closed";
  const bar = !live ? "bg-outline-variant" : open === 0 ? "bg-success" : "bg-primary";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.companyName}, ${chip.label}, ${filled} of ${total} slots filled`}
      className="gap-3 rounded-xl bg-surface p-4 active:opacity-90"
    >
      <View className="flex-row items-center gap-4">
        <ShiftDateTile date={job.date} compact />
        <View className="flex-1 gap-1">
          <Text variant="title-medium" numberOfLines={1}>{job.companyName}</Text>
          <View className="flex-row items-center gap-1">
            <Icon name="schedule" size={16} />
            <Text variant="body-medium" color="on-surface-variant" numberOfLines={1} className="flex-1">{formatTimeRange(job.startTime, job.endTime)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon name="location_on" size={16} />
            <Text variant="body-medium" color="on-surface-variant" numberOfLines={1} className="flex-1">{job.locationAddress}</Text>
          </View>
        </View>
        <View className="self-center">
          <StatusChip label={chip.label} tone={chip.tone} showIcon={false} />
        </View>
      </View>
      <View className="gap-2">
        <Text variant="body-small" color="on-surface-variant">{`${filled} of ${total} slots filled`}</Text>
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-container">
          <View className={`h-1.5 rounded-full ${bar}`} style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
        </View>
      </View>
    </Pressable>
  );
}
