import React from "react";
import { Pressable } from "react-native";
import { Icon } from "@/components/ui/Icon";
import type { ColorToken } from "@/components/ui/Text";

export interface IconButtonProps {
  icon: string;
  accessibilityLabel: string;
  onPress?: () => void;
  color?: ColorToken;
  filled?: boolean;
  size?: number;
  disabled?: boolean;
  className?: string;
}

// SL Icon Button (Figma 209:425): 40px touch target, 24px icon.
export function IconButton({ icon, accessibilityLabel, onPress, color = "on-surface-variant", filled, size = 24, disabled, className = "" }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`h-10 w-10 items-center justify-center rounded-full active:bg-on-surface/10 ${disabled ? "opacity-40" : ""} ${className}`}
    >
      <Icon name={icon} size={size} color={color} filled={filled} />
    </Pressable>
  );
}

// Toggle icon button/Bookmark (Figma 228:2505). Selected = saved. Use it everywhere a shift can be saved.
export function BookmarkButton({ saved, onToggle, className = "" }: { saved: boolean; onToggle?: () => void; className?: string }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={4}
      accessibilityRole="togglebutton"
      accessibilityLabel={saved ? "Remove from saved" : "Save shift"}
      accessibilityState={{ checked: saved }}
      className={`h-10 w-10 items-center justify-center rounded-full active:bg-on-surface/10 ${className}`}
    >
      <Icon name={saved ? "bookmark" : "bookmark_border"} color={saved ? "primary" : "on-surface-variant"} />
    </Pressable>
  );
}
