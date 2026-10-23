import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CancelReasonModalProps {
  visible: boolean;
  title: string;
  description: string;
  reasons: string[]; // last entry may be "Other", which shows a free-text input
  keepLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelReasonModal({
  visible,
  title,
  description,
  reasons,
  keepLabel,
  isSubmitting,
  onClose,
  onConfirm,
}: CancelReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState(reasons[0]);
  const [otherReasonText, setOtherReasonText] = useState("");

  useEffect(() => {
    if (visible) {
      setSelectedReason(reasons[0]);
      setOtherReasonText("");
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(
      selectedReason === "Other"
        ? (otherReasonText.trim() ? `Other: ${otherReasonText.trim()}` : "Other")
        : selectedReason
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface rounded-t-3xl p-6 pb-10 border-t border-outline">
          <View className="w-12 h-1.5 bg-outline rounded-full self-center mb-4" />

          <Text className="text-headline-small font-bold text-on-surface mb-1">{title}</Text>
          <Text className="text-body-medium text-on-surface-variant mb-5">{description}</Text>

          {/* Reason Options */}
          <View className="gap-2.5 mb-4">
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-outline bg-surface-variant/20'
                  }`}
                >
                  <Text className={`font-medium ${isSelected ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                    {reason}
                  </Text>
                  <MaterialCommunityIcons
                    name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                    size={20}
                    color={isSelected ? "#006A60" : "#747775"}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Custom Input for 'Other' */}
          {selectedReason === "Other" && (
            <View className="mb-4">
              <Text className="text-body-small text-on-surface-variant mb-1 font-medium">
                Please describe your reason (optional):
              </Text>
              <TextInput
                value={otherReasonText}
                onChangeText={setOtherReasonText}
                placeholder="Enter details here..."
                placeholderTextColor="#747775"
                multiline
                numberOfLines={3}
                className="p-3 border border-outline rounded-xl bg-surface text-on-surface text-body-medium min-h-[70px]"
                style={{ textAlignVertical: 'top' }}
              />
            </View>
          )}

          {/* Modal Actions */}
          <View className="flex-row gap-3 mt-2">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3.5 rounded-full border border-outline items-center justify-center active:bg-surface-variant/30"
            >
              <Text className="font-semibold text-on-surface">{keepLabel}</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-full bg-red-600 items-center justify-center active:opacity-90"
            >
              <Text className="font-semibold text-white">
                {isSubmitting ? 'Cancelling...' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
