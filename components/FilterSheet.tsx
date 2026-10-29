import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FilterChip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/Text";
import { DATE_FILTERS, NO_FILTERS, PAY_FILTERS, ShiftFilters, TIME_FILTERS } from "@/src/lib/shiftFilters";

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// Bottom sheet/Filter shifts (Figma 239:2662). Edits a draft; the confirm label shows the live result count.
export function FilterSheet({
  visible,
  value,
  onApply,
  onDismiss,
  countFor,
}: {
  visible: boolean;
  value: ShiftFilters;
  onApply: (f: ShiftFilters) => void;
  onDismiss: () => void;
  countFor: (f: ShiftFilters) => number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  const count = countFor(draft);

  const section = (title: string, chips: React.ReactNode) => (
    <View className="gap-3 px-5 pt-6">
      <Text variant="title-small" color="on-surface-variant">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{chips}</View>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title="Filter shifts"
      headerAction={<Button variant="text" label="Clear all" onPress={() => setDraft(NO_FILTERS)} />}
      footer={
        <Button
          label={count === 1 ? "Show 1 shift" : `Show ${count} shifts`}
          onPress={() => onApply(draft)}
          disabled={count === 0}
          className="flex-1"
        />
      }
    >
      {section("Date", DATE_FILTERS.map((o) => (
        <FilterChip key={o.value} label={o.label} selected={draft.dates.includes(o.value)} onPress={() => setDraft({ ...draft, dates: toggle(draft.dates, o.value) })} />
      )))}
      {section("Pay per shift", PAY_FILTERS.map((o) => (
        <FilterChip key={o.value} label={o.label} selected={draft.minPay === o.value} onPress={() => setDraft({ ...draft, minPay: o.value })} />
      )))}
      {section("Shift time", TIME_FILTERS.map((o) => (
        <FilterChip key={o.value} label={o.label} selected={draft.times.includes(o.value)} onPress={() => setDraft({ ...draft, times: toggle(draft.times, o.value) })} />
      )))}
    </BottomSheet>
  );
}
