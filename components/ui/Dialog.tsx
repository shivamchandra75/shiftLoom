import React from "react";
import { Modal, Pressable, View } from "react-native";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

// Dialog (Figma 238:2600): confirmation before an action. tone="error" for destructive actions.
export function Dialog({
  visible,
  icon,
  title,
  body,
  confirmLabel,
  onConfirm,
  dismissLabel = "Cancel",
  onDismiss,
  tone = "default",
  loading = false,
}: {
  visible: boolean;
  icon?: string;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  dismissLabel?: string;
  onDismiss: () => void;
  tone?: "default" | "error";
  loading?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable onPress={onDismiss} accessibilityLabel="Close" className="flex-1 items-center justify-center bg-black/30 px-6">
        <Pressable accessibilityViewIsModal style={elevation.raised} className="w-full max-w-[312px] items-center gap-4 rounded-xl bg-surface px-5 py-6">
          {icon && <Icon name={icon} color={tone === "error" ? "error" : "on-surface-variant"} />}
          <Text variant="headline-small" className="text-center" accessibilityRole="header">{title}</Text>
          <Text variant="body-medium" color="on-surface-variant" className="text-center">{body}</Text>
          <View className="w-full flex-row justify-end gap-2 pt-2">
            <Button variant="text" label={dismissLabel} onPress={onDismiss} disabled={loading} />
            <Button label={confirmLabel} onPress={onConfirm} tone={tone} loading={loading} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
