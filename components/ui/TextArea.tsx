import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { colors } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

// Text field (Figma 238:2552): outlined multi-line field. Enabled, Focused and Error states.
export function TextArea({
  value,
  onChangeText,
  placeholder,
  supportingText,
  error,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  supportingText?: string;
  error?: string | null;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const border = error ? "border-2 border-error" : focused ? "border-2 border-primary" : "border border-outline";
  return (
    <View className="gap-1">
      <View className={`h-28 rounded-lg bg-surface px-4 py-3 ${border}`}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors["on-surface-variant"]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          multiline
          textAlignVertical="top"
          accessibilityLabel={placeholder}
          className="flex-1 font-inter text-body-large text-on-surface"
        />
      </View>
      {(error || supportingText) && (
        <View className="flex-row items-center gap-1 px-4">
          {error && <Icon name="error" size={16} color="error" />}
          <Text variant="body-small" color={error ? "error" : "on-surface-variant"} className="flex-1">{error || supportingText}</Text>
        </View>
      )}
    </View>
  );
}
