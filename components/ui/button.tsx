import React from "react";
import { Pressable, ActivityIndicator, View } from "react-native";
import { colors } from "@/src/theme/tokens";
import { Text, ColorToken } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** medium = 40px (default everywhere), large = 48px */
  size?: "medium" | "large";
  /** error = destructive action (cancel shift, remove, reject) */
  tone?: "default" | "error";
  leadingIcon?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const CONTAINER: Record<ButtonVariant, string> = {
  filled: "bg-primary",
  tonal: "bg-primary-container",
  outlined: "border border-outline-variant",
  text: "",
};
const LABEL: Record<ButtonVariant, ColorToken> = {
  filled: "on-primary",
  tonal: "on-primary-container",
  outlined: "primary",
  text: "primary",
};

// SL Button (Figma 209:76): Style × State × Leading icon × Size.
export function Button({
  label,
  onPress,
  variant = "filled",
  size = "medium",
  tone = "default",
  leadingIcon,
  loading = false,
  disabled = false,
  className = "",
  accessibilityLabel,
}: ButtonProps) {
  const isError = tone === "error";
  const inactive = disabled && !loading;
  let container = CONTAINER[variant];
  let labelColor: ColorToken = LABEL[variant];
  if (isError && variant === "filled") container = "bg-error";
  if (isError && variant === "outlined") container = "border border-error";
  if (isError && variant !== "filled" && variant !== "tonal") labelColor = "error";
  if (inactive) {
    container = variant === "filled" || variant === "tonal" ? "bg-on-surface/10" : variant === "outlined" ? "border border-on-surface/10" : "";
  }
  const height = size === "large" ? "h-12" : "h-10";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`${height} flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-80 ${container} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[labelColor]} />
      ) : leadingIcon ? (
        <View className={inactive ? "opacity-40" : ""}>
          <Icon name={leadingIcon} size={18} color={inactive ? "on-surface" : labelColor} />
        </View>
      ) : null}
      <Text
        variant={size === "large" ? "title-medium" : "label-large"}
        color={inactive ? "on-surface" : labelColor}
        className={inactive ? "opacity-40" : ""}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// shortcut: old call sites (auth, onboarding) still use these; remove once those screens are migrated
export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="filled" />;
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="outlined" />;
}
