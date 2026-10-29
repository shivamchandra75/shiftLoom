import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";

// Empty state (Figma 230:2581): what's missing and the one action that fixes it.
export function EmptyState({ icon, title, body, actionLabel, onAction }: { icon: string; title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="items-center gap-2 px-6 py-12">
      <View className="mb-2 h-[72px] w-[72px] items-center justify-center rounded-full bg-surface">
        <Icon name={icon} size={32} />
      </View>
      <Text variant="title-medium" className="text-center">{title}</Text>
      <Text variant="body-medium" color="on-surface-variant" className="text-center">{body}</Text>
      {actionLabel && onAction && <Button variant="tonal" label={actionLabel} onPress={onAction} className="mt-4" />}
    </View>
  );
}
