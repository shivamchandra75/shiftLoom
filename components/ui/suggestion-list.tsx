import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SuggestionListProps<T> {
  items: T[];
  loading: boolean;
  error: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  labelOf: (item: T) => string;
  onSelect: (item: T) => void;
  emptyText?: string;
  footer?: string;
}

// Dropdown-style results under an autocomplete input. Plain Views (not FlatList) so it can sit inside a ScrollView.
export function SuggestionList<T>({ items, loading, error, icon, labelOf, onSelect, emptyText, footer }: SuggestionListProps<T>) {
  if (!loading && !error && items.length === 0 && !emptyText) return null;

  return (
    <View className="border border-outline rounded-2xl overflow-hidden bg-surface">
      {loading && items.length === 0 ? (
        <View className="flex-row items-center gap-3 p-4">
          <ActivityIndicator size="small" />
          <Text className="text-body-medium text-on-surface-variant">Searching…</Text>
        </View>
      ) : error ? (
        <Text className="p-4 text-body-medium text-error">{error}</Text>
      ) : items.length === 0 ? (
        <Text className="p-4 text-body-medium text-on-surface-variant">{emptyText}</Text>
      ) : (
        items.map((item, i) => (
          <Pressable
            key={`${labelOf(item)}-${i}`}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            className={`flex-row items-center gap-3 px-4 py-3 min-h-[48px] active:bg-surface-variant ${i ? "border-t border-outline" : ""}`}
          >
            <MaterialCommunityIcons name={icon} size={20} color="#747775" />
            <Text className="flex-1 text-body-medium text-on-surface" numberOfLines={2}>{labelOf(item)}</Text>
          </Pressable>
        ))
      )}
      {!!footer && items.length > 0 && (
        <Text className="px-4 py-2 text-label-small text-on-surface-variant border-t border-outline">{footer}</Text>
      )}
    </View>
  );
}
