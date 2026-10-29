import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

// Step indicator (Figma 253:2909): Post a shift progress. Segments up to the current step use primary.
export function StepIndicator({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <View className="gap-2" accessible accessibilityLabel={`Step ${step} of ${total}, ${title}`}>
      <View className="flex-row gap-1">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-outline-variant"}`} />
        ))}
      </View>
      <Text variant="title-small" color="on-surface-variant" className="pt-1">{`Step ${step} of ${total}`}</Text>
      <Text variant="headline-small" accessibilityRole="header">{title}</Text>
    </View>
  );
}
