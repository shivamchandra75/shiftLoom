import React, { useState } from "react";
import { View, Text, TextInput } from "@/src/tw";

interface OutlinedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  className?: string;
}

export function OutlinedInput({
  label,
  value,
  onChangeText,
  placeholder = "",
  error = "",
  secureTextEntry = false,
  keyboardType = "default",
  className = "",
}: OutlinedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // M3 styling determinations
  const hasError = !!error;
  const labelColor = hasError
    ? "text-error"
    : isFocused
    ? "text-primary"
    : "text-on-surface-variant";

  const borderColor = hasError
    ? "border-error"
    : isFocused
    ? "border-primary"
    : "border-outline-variant";

  return (
    <View className={`w-full gap-1.5 ${className}`}>
      {/* Label outside in clean layout */}
      <Text className={`text-label-medium font-semibold ${labelColor} ml-1`}>
        {label}
      </Text>

      {/* Input container */}
      <View
        className={`w-full border rounded-2xl px-4 py-3 min-h-[56px] justify-center ${borderColor} bg-surface`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="var(--outline-variant)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="text-body-large text-on-surface w-full"
          style={{ paddingVertical: 2 }}
        />
      </View>

      {/* Integrated Error message */}
      {hasError ? (
        <Text className="text-label-small text-error ml-2 mt-0.5">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
