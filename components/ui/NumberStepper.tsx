import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";

// Number stepper (Figma 253:2872): whole numbers only, 1 or more. Decrease is disabled at the minimum.
export function NumberStepper({ label, value, onChange, min = 1, max = 99 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View className="gap-2">
      <Text variant="title-small" color="on-surface-variant">{label}</Text>
      <View className="h-14 flex-row items-center justify-between rounded-lg border border-outline bg-surface px-1">
        <IconButton icon="remove" size={20} accessibilityLabel={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
        <Text variant="title-medium" accessibilityLiveRegion="polite">{value}</Text>
        <IconButton icon="add" size={20} accessibilityLabel={`Increase ${label.toLowerCase()}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}
