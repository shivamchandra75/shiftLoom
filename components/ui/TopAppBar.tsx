import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";

// Top app bar/Small (Figma 221:2426): detail screens. Leading button defaults to back.
export function TopAppBarSmall({
  title = "",
  leadingIcon = "arrow_back",
  leadingLabel = "Go back",
  onLeadingPress,
  trailing,
}: { title?: string; leadingIcon?: string; leadingLabel?: string; onLeadingPress?: () => void; trailing?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-1 px-4 py-2">
      <IconButton icon={leadingIcon} accessibilityLabel={leadingLabel} onPress={onLeadingPress ?? (() => router.back())} />
      <Text variant="title-large" numberOfLines={1} className="flex-1">{title}</Text>
      {trailing && <View className="flex-row">{trailing}</View>}
    </View>
  );
}

// Top app bar/Large (Figma 221:2441): top-level tab screens.
export function TopAppBarLarge({ title, supportingText, trailing }: { title: string; supportingText?: string; trailing?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 px-4 pb-4 pt-2">
      <View className="flex-1 gap-1">
        <Text variant="headline-small" accessibilityRole="header">{title}</Text>
        {!!supportingText && <Text variant="body-medium" color="on-surface-variant">{supportingText}</Text>}
      </View>
      {trailing && <View className="flex-row">{trailing}</View>}
    </View>
  );
}
