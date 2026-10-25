import React from "react";
import { Pressable, View } from "react-native";
import { Text, ColorToken } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export type StatusTone = "success" | "warning" | "error" | "neutral";

const TONES: Record<StatusTone, { bg: string; fg: ColorToken; icon: string }> = {
  success: { bg: "bg-success-container", fg: "on-success-container", icon: "check_circle" },
  warning: { bg: "bg-warning-container", fg: "on-warning-container", icon: "hourglass_top" },
  error: { bg: "bg-error-container", fg: "on-error-container", icon: "error" },
  neutral: { bg: "bg-surface-container-high", fg: "on-surface-variant", icon: "task_alt" },
};

// Status chip (Figma 229:2500). Read-only. Tone carries meaning: success = accepted/verified,
// warning = in review/pending, error = cancelled/rejected, neutral = completed/not uploaded.
export function StatusChip({ label, tone, showIcon = true, icon }: { label: string; tone: StatusTone; showIcon?: boolean; icon?: string }) {
  const t = TONES[tone];
  return (
    <View className={`flex-row items-center justify-center gap-1 self-start rounded-full px-3 py-1 ${t.bg}`}>
      {showIcon && <Icon name={icon ?? t.icon} size={16} color={t.fg} />}
      <Text variant="label-large" color={t.fg}>{label}</Text>
    </View>
  );
}

// Filter chip (Figma 221:2465): outlined when off, primary-container when on.
export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`rounded-full px-4 py-2 active:opacity-80 ${selected ? "bg-primary-container" : "border border-outline-variant"}`}
    >
      <Text variant="label-large" color={selected ? "on-primary-container" : "on-surface-variant"}>{label}</Text>
    </Pressable>
  );
}

// Assist chip (Figma 238:2576): inline Filter / Sort triggers. Selected = a filter is applied.
export function AssistChip({
  label,
  icon,
  selected = false,
  showDropdown = true,
  onPress,
}: { label: string; icon: string; selected?: boolean; showDropdown?: boolean; onPress?: () => void }) {
  const fg: ColorToken = selected ? "on-primary-container" : "on-surface";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`flex-row items-center gap-2 rounded-full px-3 py-2 active:opacity-80 ${selected ? "bg-primary-container" : "bg-surface"}`}
    >
      <Icon name={icon} size={18} color={fg} />
      <Text variant="label-large" color={fg}>{label}</Text>
      {showDropdown && <Icon name="arrow_drop_down" size={18} color={fg} />}
    </Pressable>
  );
}
