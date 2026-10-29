import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { shiftDateParts } from "@/src/lib/utils";

// Date tile that leads every shift card: weekday, day, month on surface-container.
export function ShiftDateTile({ date, dimmed = false, compact = false }: { date: string; dimmed?: boolean; compact?: boolean }) {
  const { weekday, day, month } = shiftDateParts(date);
  return (
    <View className={`items-center justify-center rounded-lg bg-surface-container ${compact ? "h-[70px] w-14" : "h-20 w-16"}`}>
      <Text variant="label-medium" color="on-surface-variant">{weekday}</Text>
      <Text variant={compact ? "title-large" : "headline-small"} color={dimmed ? "on-surface-variant" : "on-surface"}>{day}</Text>
      <Text variant="label-medium" color="on-surface-variant">{month}</Text>
    </View>
  );
}
