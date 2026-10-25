import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

// Radio list item (Figma 238:2533): single choice from a list (cancel and reject reasons).
export function RadioListItem({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="flex-row items-center gap-4 px-5 py-3 active:bg-on-surface/5"
    >
      <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-primary" : "border-on-surface-variant"}`}>
        {selected && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </View>
      <Text variant="body-large" className="flex-1">{label}</Text>
    </Pressable>
  );
}
