import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  textClassName = "",
}: ButtonProps) {
  const isPrimary = variant === "primary";
  
  // M3 styling classes
  const baseButtonClass = "rounded-full py-2 px-6 items-center justify-center flex-row min-h-[52px]";
  const primaryButtonClass = isPrimary
    ? "bg-primary active:bg-primary/90"
    : "active:bg-secondary/90 border border-outline";
  
  const disabledClass = disabled || loading ? "opacity-50" : "";
  
  // Use text-lg instead of custom text-label-large to avoid prefix conflicts with text-on-primary
  // Removed tracking-wider because 'em' units can cause text rendering corruption on Android
  const baseTextClass = "text-lg font-bold";
  const primaryTextClass = isPrimary ? "text-on-primary" : "text-on-secondary";

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={`${baseButtonClass} ${primaryButtonClass} ${disabledClass} ${className}`}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={isPrimary ? "var(--on-primary)" : "var(--on-secondary)"} 
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text className={`${baseTextClass} ${primaryTextClass} ${textClassName}`}>
        {label}
      </Text>
    </Pressable>
  );
}

// Named exports for explicit convenience
export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="secondary" />;
}
