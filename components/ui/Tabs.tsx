import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

// Tab (Figma 229:2505): Gemini-style pill tabs. The selected tab sits on surface, others are plain text.
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row gap-1" accessibilityRole="tablist">
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`rounded-full px-4 py-2 ${selected ? "bg-surface" : "active:bg-on-surface/10"}`}
          >
            <Text variant="title-small" color={selected ? "on-surface" : "on-surface-variant"}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
