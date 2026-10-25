import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface SnackbarMessage {
  text: string;
  tone: "success" | "error";
}

interface SnackbarProps {
  message: SnackbarMessage | null;
  onHide: () => void;
  bottomOffset?: number;
}

// M3-style snackbar: brief, non-blocking confirmation at the bottom of the screen. Errors stay until dismissed.
export function Snackbar({ message, onHide, bottomOffset = 0 }: SnackbarProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message || message.tone === "error") return;
    const timer = setTimeout(onHide, 3500);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;
  const isError = message.tone === "error";

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="absolute left-4 right-4 flex-row items-center gap-3 rounded-xl bg-on-surface px-4 py-3 shadow-lg"
      style={{ bottom: Math.max(insets.bottom, 12) + bottomOffset }}
    >
      <MaterialCommunityIcons name={isError ? "alert-circle" : "check-circle"} size={20} color={isError ? "#F2B8B5" : "#6DD58C"} />
      <Text className="flex-1 text-body-medium text-on-primary">{message.text}</Text>
      <Pressable onPress={onHide} hitSlop={8} accessibilityLabel="Dismiss">
        <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
