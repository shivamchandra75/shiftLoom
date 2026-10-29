import React from "react";
import { Pressable, View } from "react-native";
import { elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

// Floating toolbar (Figma 229:2528): Filter + Sort pill that floats above lists (My shifts, Saved).
// filterCount > 0 shows the Filtered state.
export function FloatingToolbar({
  sortLabel,
  onSortPress,
  onFilterPress,
  filterCount = 0,
  sortRef,
}: {
  sortLabel: string;
  onSortPress: () => void;
  onFilterPress?: () => void;
  filterCount?: number;
  sortRef?: React.Ref<View>;
}) {
  const filtered = filterCount > 0;
  return (
    <View style={elevation.raised} className="flex-row items-center gap-1 self-center rounded-full bg-surface p-1">
      {onFilterPress && (
        <>
          <Pressable
            onPress={onFilterPress}
            accessibilityRole="button"
            accessibilityLabel={filtered ? `Filter, ${filterCount} applied` : "Filter"}
            className="flex-row items-center gap-2 rounded-full px-4 py-3 active:opacity-80"
          >
            {/* See Tabs: a background added after mount loses its radius on Android, so only opacity changes */}
            <View pointerEvents="none" className="absolute inset-0 rounded-full bg-surface-container" style={{ opacity: filtered ? 1 : 0 }} />
            <Icon name="filter_list" size={20} color="on-surface" />
            <Text variant="label-large">Filter</Text>
            {filtered && (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Text variant="label-small" color="on-primary">{filterCount}</Text>
              </View>
            )}
          </Pressable>
          <View className="h-6 w-px bg-outline-variant" />
        </>
      )}
      <Pressable
        ref={sortRef}
        onPress={onSortPress}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${sortLabel}`}
        className="flex-row items-center gap-2 rounded-full px-4 py-3 active:opacity-80"
      >
        <Icon name="swap_vert" size={20} color="on-surface" />
        <Text variant="label-large">{sortLabel}</Text>
      </Pressable>
    </View>
  );
}
