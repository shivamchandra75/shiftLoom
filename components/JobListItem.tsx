import React from "react";
import { Pressable, View } from "react-native";
import type { Job } from "@/src/services/jobService";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { BookmarkButton } from "@/components/ui/IconButton";
import { ShiftDateTile } from "@/components/ShiftDateTile";
import { formatInr, formatTimeRange } from "@/src/lib/utils";

// Job list item, Style=Date-led (Figma 216:2286). Saved toggles the bookmark.
export function JobListItem({ job, wage, saved, onToggleSave, onPress }: { job: Job; wage: number; saved: boolean; onToggleSave?: () => void; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.companyName}, ${formatInr(wage)} per shift`}
      className="flex-row items-center gap-4 rounded-xl bg-surface p-4 active:opacity-90"
    >
      <ShiftDateTile date={job.date} />
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
      <View className="items-end gap-1">
        {onToggleSave && <BookmarkButton saved={saved} onToggle={onToggleSave} />}
        <View className="items-end">
          <Text variant="title-medium">{formatInr(wage)}</Text>
          <Text variant="body-small" color="on-surface-variant">per shift</Text>
        </View>
      </View>
    </Pressable>
  );
}
