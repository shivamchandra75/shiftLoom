import React from "react";
import { Pressable } from "react-native";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

// FAB (Figma 253:2917). Extended at rest; pass extended={false} while the list scrolls down.
export function Fab({ label, icon = "add", extended = true, onPress, className = "" }: { label: string; icon?: string; extended?: boolean; onPress: () => void; className?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={elevation.raised}
      className={`h-14 flex-row items-center justify-center gap-3 rounded-lg bg-primary-container active:opacity-90 ${extended ? "pl-4 pr-5" : "w-14"} ${className}`}
    >
      <Icon name={icon} color="on-primary-container" />
      {extended && <Text variant="label-large" color="on-primary-container">{label}</Text>}
    </Pressable>
  );
}
