import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";

// Bottom sheet (Figma 239:2661, 239:2662, 255:3118): modal sheet over a 32% scrim, 20px side padding.
export function BottomSheet({
  visible,
  onDismiss,
  title,
  supportingText,
  headerAction,
  children,
  footer,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  supportingText?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end">
        <Pressable onPress={onDismiss} accessibilityLabel="Close" className="absolute inset-0 bg-black/30" />
        <View accessibilityViewIsModal style={[elevation.floating, { paddingBottom: 24 + insets.bottom }]} className="rounded-t-xl bg-surface">
          <View className="items-center py-4">
            <View className="h-1 w-8 rounded-full bg-outline-variant" />
          </View>
          <View className="gap-2 px-5 pb-2">
            <View className="flex-row items-center">
              <Text variant="headline-small" className="flex-1" accessibilityRole="header">{title}</Text>
              {headerAction}
            </View>
            {!!supportingText && <Text variant="body-medium" color="on-surface-variant">{supportingText}</Text>}
          </View>
          {children}
          {footer && <View className="flex-row gap-2 px-5 pt-6">{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
