import React from "react";
import { Text } from "react-native";
import type { ColorToken } from "@/components/ui/Text";

// Figma uses Material Icons Round names. Material Symbols has no "_border/_outline" names; it uses the
// unfilled font instead.
const OUTLINE_NAMES: Record<string, string> = {
  bookmark_border: "bookmark",
  delete_outline: "delete",
  work_outline: "work",
  person_outline: "person",
  error_outline: "error",
};
// Icons that are outlined in Material Icons Round even though they have no "_outline" suffix.
const ALWAYS_OUTLINED = new Set(["schedule", "task_alt", "access_time"]);

export interface IconProps {
  name: string;
  size?: number;
  color?: ColorToken;
  filled?: boolean;
  className?: string;
}

// Material Symbols Rounded, rendered through font ligatures. Decorative: hidden from screen readers,
// so give the pressable that wraps it an accessibilityLabel.
export function Icon({ name, size = 24, color = "on-surface-variant", filled, className = "" }: IconProps) {
  const outlined = OUTLINE_NAMES[name];
  const isFilled = filled ?? !(outlined || ALWAYS_OUTLINED.has(name));
  return (
    <Text
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`${isFilled ? "font-icon-filled" : "font-icon"} text-${color} ${className}`}
      style={{ fontSize: size, lineHeight: size, width: size, height: size, includeFontPadding: false, textAlign: "center" }}
    >
      {outlined ?? name}
    </Text>
  );
}
