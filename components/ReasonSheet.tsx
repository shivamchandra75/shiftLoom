import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RadioListItem } from "@/components/ui/RadioListItem";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/button";

// Bottom sheet/Cancel shift and Bottom sheet/Reject document (Figma 239:2661, 255:3118).
// Confirm stays disabled until a reason is picked; "Other" needs text before it can be sent.
export function ReasonSheet({
  visible,
  onDismiss,
  title,
  supportingText,
  reasons,
  dismissLabel,
  confirmLabel,
  onConfirm,
  loading = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  supportingText: string;
  reasons: string[];
  dismissLabel: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [otherError, setOtherError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setOther("");
    setOtherError(null);
  }, [visible]);

  const confirm = () => {
    if (selected === "Other" && !other.trim()) {
      setOtherError("Add a reason to continue");
      return;
    }
    onConfirm(selected === "Other" ? `Other: ${other.trim()}` : selected!);
  };

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      supportingText={supportingText}
      footer={
        <>
          <Button variant="outlined" label={dismissLabel} onPress={onDismiss} disabled={loading} className="flex-1" />
          <Button label={confirmLabel} tone="error" onPress={confirm} disabled={!selected} loading={loading} className="flex-1" />
        </>
      }
    >
      <View accessibilityRole="radiogroup">
        {reasons.map((r) => (
          <RadioListItem key={r} label={r} selected={selected === r} onPress={() => setSelected(r)} />
        ))}
      </View>
      {selected === "Other" && (
        <View className="px-5 pt-2">
          <TextArea
            value={other}
            onChangeText={(t) => {
              setOther(t);
              if (otherError) setOtherError(null);
            }}
            placeholder="Tell us what happened"
            supportingText="Needed when you choose Other"
            error={otherError}
            autoFocus
          />
        </View>
      )}
    </BottomSheet>
  );
}
