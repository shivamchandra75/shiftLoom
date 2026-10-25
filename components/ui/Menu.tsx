import React from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export interface Anchor { x: number; y: number; width: number; height: number }

// Menu + Menu item (Figma 229:2538, 229:2537): sort options. The selected item gets a check.
// Get the anchor with ref.current.measureInWindow((x, y, width, height) => ...).
export function Menu<T extends string>({
  anchor,
  placement = "below",
  options,
  value,
  onSelect,
  onDismiss,
}: {
  anchor: Anchor | null;
  placement?: "below" | "above";
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
  onDismiss: () => void;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  if (!anchor) return null;
  const left = Math.min(Math.max(16, anchor.x), screenW - 16 - 240);
  const position = placement === "below" ? { top: anchor.y + anchor.height + 4 } : { bottom: screenH - anchor.y + 8 };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable onPress={onDismiss} accessibilityLabel="Close menu" className="flex-1">
        <View accessibilityRole="menu" style={[elevation.raised, { position: "absolute", left, ...position }]} className="w-60 overflow-hidden rounded-lg bg-surface py-2">
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onSelect(o.value);
                  onDismiss();
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 px-4 py-3 active:bg-on-surface/5 ${selected ? "bg-surface-container" : ""}`}
              >
                <Text variant="body-large" className="flex-1">{o.label}</Text>
                {selected && <Icon name="check" size={20} color="on-surface" />}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}
