import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { colors, elevation } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export interface Suggestion {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  /** Primary-colored row, e.g. "Add new company". */
  accent?: boolean;
}

// Menu/Company suggestions (Figma 253:2918): results under a field while typing. Plain Views (not a
// FlatList) so it can sit inside a ScrollView.
export function SuggestionList({
  items,
  loading = false,
  error = "",
  emptyText,
  footer,
  onSelect,
}: {
  items: Suggestion[];
  loading?: boolean;
  error?: string;
  emptyText?: string;
  footer?: string;
  onSelect: (item: Suggestion) => void;
}) {
  const message = error || (loading && items.length === 0 ? "Searching…" : items.length === 0 ? emptyText : "");
  if (!message && items.length === 0) return null;

  return (
    <View style={elevation.raised} className="overflow-hidden rounded-lg bg-surface py-2">
      {message ? (
        <View className="flex-row items-center gap-3 px-4 py-3">
          {loading && !error && <ActivityIndicator size="small" color={colors.primary} />}
          <Text variant="body-medium" color={error ? "error" : "on-surface-variant"} className="flex-1">{message}</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            className="flex-row items-center gap-4 px-4 py-2.5 active:bg-on-surface/5"
          >
            <Icon name={item.icon} size={20} color={item.accent ? "primary" : "on-surface-variant"} />
            <View className="flex-1">
              <Text variant="body-large" color={item.accent ? "primary" : "on-surface"} numberOfLines={2}>{item.title}</Text>
              {!!item.subtitle && <Text variant="body-small" color="on-surface-variant" numberOfLines={1}>{item.subtitle}</Text>}
            </View>
          </Pressable>
        ))
      )}
      {!!footer && items.length > 0 && <Text variant="label-small" color="on-surface-variant" className="px-4 pb-1 pt-2">{footer}</Text>}
    </View>
  );
}
