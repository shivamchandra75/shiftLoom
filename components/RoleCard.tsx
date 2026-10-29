import React, { useRef, useState } from "react";
import { View } from "react-native";
import type { RoleRow } from "@/src/lib/validateJobForm";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { FormField } from "@/components/ui/FormField";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Anchor, Menu } from "@/components/ui/Menu";

export const ROLE_OPTIONS: { label: string; value: RoleRow["role"] }[] = [
  { label: "Driver", value: "driver" },
  { label: "Steward", value: "steward" },
  { label: "Chef", value: "chef" },
];

// Role card (Figma 255:2848): one per role on step 3. Remove is hidden when only one role is left.
export function RoleCard({
  index,
  row,
  usedRoles,
  canRemove,
  errors,
  onChange,
  onRemove,
}: {
  index: number;
  row: RoleRow;
  usedRoles: RoleRow["role"][];
  canRemove: boolean;
  errors: Record<string, string>;
  onChange: (patch: Partial<RoleRow>) => void;
  onRemove: () => void;
}) {
  const fieldRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const openMenu = () => fieldRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  const options = ROLE_OPTIONS.filter((o) => o.value === row.role || !usedRoles.includes(o.value));

  return (
    <View className="gap-4 rounded-xl bg-surface p-4">
      <View className="flex-row items-center">
        <Text variant="title-small" color="on-surface-variant" className="flex-1">{`Role ${index + 1}`}</Text>
        {canRemove && <IconButton icon="delete_outline" size={22} accessibilityLabel={`Remove role ${index + 1}`} onPress={onRemove} />}
      </View>
      <FormField
        label="Role"
        value={ROLE_OPTIONS.find((o) => o.value === row.role)?.label ?? ""}
        placeholder="Select a role"
        trailingIcon="arrow_drop_down"
        error={errors[`role.${row.key}.role`]}
        onPress={openMenu}
        fieldRef={fieldRef}
      />
      <View className="flex-row items-start gap-3">
        <View className="w-[140px]">
          <NumberStepper label="Slots" value={Math.max(1, parseInt(row.slots, 10) || 1)} onChange={(n) => onChange({ slots: String(n) })} />
        </View>
        <View className="flex-1">
          <FormField
            label="Wage per shift"
            prefix="₹"
            value={row.wage}
            onChangeText={(t) => onChange({ wage: t.replace(/\D/g, "") })}
            keyboardType="number-pad"
            placeholder="700"
            helper="Paid to each worker"
            error={errors[`role.${row.key}.wage`]}
          />
        </View>
      </View>
      <Menu anchor={anchor} options={options} value={row.role} onSelect={(role) => onChange({ role })} onDismiss={() => setAnchor(null)} />
    </View>
  );
}
