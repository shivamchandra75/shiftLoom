import React, { useState, useRef } from "react";
import { View, TextInput, Pressable } from "@/src/tw";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onBackPress?: () => void;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search shifts...",
  onBackPress,
  className = "",
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<any>(null);

  const activeBorder = isFocused ? "border-primary bg-background" : "border-transparent bg-surface-variant";

  const handleClear = () => {
    onChangeText("");
    inputRef.current?.focus();
  };

  const handleBack = () => {
    inputRef.current?.blur();
    setIsFocused(false);
    if (onBackPress) {
      onBackPress();
    }
  };

  return (
    <View
      className={`flex-row items-center border rounded-full px-4 py-2 min-h-[48px] ${activeBorder} ${className}`}
    >
      {/* Left Icon (Back Button when active, Search when inactive) */}
      {isFocused ? (
        <Pressable onPress={handleBack} className="mr-3">
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={22} 
            color="var(--on-surface)" 
          />
        </Pressable>
      ) : (
        <View className="mr-3">
          <MaterialCommunityIcons 
            name="magnify" 
            size={22} 
            color="var(--on-surface-variant)" 
          />
        </View>
      )}

      {/* TextInput */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="var(--outline-variant)"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 text-body-large text-on-surface py-1"
        style={{ paddingVertical: 4 }}
      />

      {/* Right Icon (Clear Button when active and text exists) */}
      {isFocused && value.length > 0 ? (
        <Pressable onPress={handleClear} className="ml-2">
          <MaterialCommunityIcons 
            name="close-circle" 
            size={20} 
            color="var(--on-surface-variant)" 
          />
        </Pressable>
      ) : null}
    </View>
  );
}
