import React, { useRef } from "react";
import { View, TextInput } from "react-native";
import { colors } from "@/src/theme/tokens";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}

// Search bar (Figma 238:2563): surface pill on the surface-container page. Clear appears while typing.
export function SearchBar({ value, onChangeText, placeholder = "Search by area or business", className = "" }: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  return (
    <View className={`h-14 flex-row items-center gap-3 rounded-full bg-surface pl-4 pr-2 ${className}`}>
      <Icon name="search" />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors["on-surface-variant"]}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        className="flex-1 font-inter text-body-large text-on-surface"
      />
      {value.length > 0 && (
        <IconButton
          icon="close"
          accessibilityLabel="Clear search"
          onPress={() => {
            onChangeText("");
            inputRef.current?.focus();
          }}
        />
      )}
    </View>
  );
}
