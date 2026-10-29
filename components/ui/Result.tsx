import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

// Result (Figma 238:2625): full-screen outcome of an action. Success uses success-container,
// failure uses error-container.
export function Result({
  status,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon,
}: {
  status: "success" | "failure";
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  icon?: string;
}) {
  const ok = status === "success";
  return (
    <View className="items-center gap-2 px-6 py-12">
      <View className={`mb-4 h-24 w-24 items-center justify-center rounded-full ${ok ? "bg-success-container" : "bg-error-container"}`}>
        <Icon name={icon ?? (ok ? "check_circle" : "cloud_off")} size={48} color={ok ? "on-success-container" : "on-error-container"} />
      </View>
      <Text variant="headline-small" className="text-center" accessibilityRole="header">{title}</Text>
      <Text variant="body-large" color="on-surface-variant" className="text-center">{body}</Text>
      <View className="w-full gap-2 pt-6">
        <Button label={primaryLabel} onPress={onPrimary} className="w-full" />
        {secondaryLabel && onSecondary && <Button variant="text" label={secondaryLabel} onPress={onSecondary} className="w-full" />}
      </View>
    </View>
  );
}
