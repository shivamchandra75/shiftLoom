import React, { useEffect } from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export interface SnackbarMessage {
  text: string;
  tone: "success" | "error";
}

interface SnackbarProps {
  message: SnackbarMessage | null;
  onHide: () => void;
  bottomOffset?: number;
}

// Snackbar (Figma 238:2577): confirms a finished action. Success hides itself; errors stay until dismissed.
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
      className="absolute left-4 right-4 flex-row items-center gap-3 rounded-md bg-on-surface py-3 pl-4 pr-2"
      style={[elevation.raised, { bottom: Math.max(insets.bottom, 12) + bottomOffset }]}
    >
      {isError && <Icon name="error" size={20} color="error-container" />}
      <Text variant="body-medium" color="surface" className="flex-1">{message.text}</Text>
      <Pressable onPress={onHide} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss" className="h-8 w-8 items-center justify-center">
        <Icon name="close" size={18} color="surface" />
      </Pressable>
    </View>
  );
}
