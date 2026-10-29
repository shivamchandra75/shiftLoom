import React from "react";
import { Pressable, View } from "react-native";
import { Text, ColorToken } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export interface ListItemProps {
  headline: string;
  supportingText?: string;
  leadingIcon?: string;
  /** Replaces the leading icon circle, e.g. an avatar. */
  leading?: React.ReactNode;
  /** Tints the leading circle, e.g. warning for "Verify your account". */
  leadingTone?: "neutral" | "warning";
  trailingIcon?: string;
  /** Replaces the trailing icon, e.g. a StatusChip. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** 10px vertical padding instead of 16, for review summaries. */
  dense?: boolean;
}

const LEADING: Record<"neutral" | "warning", { bg: string; fg: ColorToken }> = {
  neutral: { bg: "bg-surface-container", fg: "on-surface-variant" },
  warning: { bg: "bg-warning-container", fg: "on-warning-container" },
};

// List item/Icon and List item/Status (Figma 221:2450, 230:2570). Rows inside a Panel.
export function ListItem({ headline, supportingText, leadingIcon, leading, leadingTone = "neutral", trailingIcon, trailing, onPress, accessibilityLabel, dense }: ListItemProps) {
  const tone = LEADING[leadingTone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      className={`flex-row items-center gap-4 px-4 active:bg-on-surface/5 ${dense ? "py-2.5" : "py-4"}`}
    >
      {leading ??
        (leadingIcon && (
          <View className={`h-10 w-10 items-center justify-center rounded-full ${tone.bg}`}>
            <Icon name={leadingIcon} size={20} color={tone.fg} />
          </View>
        ))}
      <View className="flex-1 gap-1">
        <Text variant="body-large">{headline}</Text>
        {!!supportingText && <Text variant="body-medium" color="on-surface-variant">{supportingText}</Text>}
      </View>
      {trailing ?? (trailingIcon && <Icon name={trailingIcon} />)}
    </Pressable>
  );
}

// Divider inset to line up with the text column of a ListItem (16 padding + 40 icon + 16 gap).
export function Divider({ inset = 72 }: { inset?: number }) {
  return (
    <View style={{ paddingLeft: inset }} className="pr-4">
      <View className="h-px bg-surface-container" />
    </View>
  );
}

// Surface panel that groups rows (Gemini settings style) and separates them with Dividers.
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View className={`overflow-hidden rounded-xl bg-surface ${className}`}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Divider />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

// Subheader (Figma 221:2459): section label above a panel or list.
export function Subheader({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <View className="flex-row items-center px-1 pb-1 pt-2">
      <Text variant="title-small" color="on-surface-variant" className="flex-1">{label}</Text>
      {trailing}
    </View>
  );
}
