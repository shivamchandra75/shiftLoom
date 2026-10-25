import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";

const QUICK_REASONS = ["Blurry or unreadable", "Document expired", "Wrong document type", "Name doesn't match profile"];
const MAX_LENGTH = 500;

interface RejectReasonModalProps {
  visible: boolean;
  documentLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectReasonModal({ visible, documentLabel, isSubmitting, onClose, onConfirm }: RejectReasonModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const trimmed = reason.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={onClose} />
          <View className="bg-surface rounded-t-3xl p-6 pb-10 border-t border-outline gap-4">
            <View className="w-12 h-1.5 bg-outline rounded-full self-center" />
            <View className="gap-1">
              <Text className="text-headline-small font-bold text-on-surface">Reject {documentLabel}</Text>
              <Text className="text-body-medium text-on-surface-variant">The worker will see this reason and can upload a new file.</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {QUICK_REASONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full border ${reason === r ? "bg-primary border-primary" : "border-outline"}`}
                >
                  <Text className={`text-label-medium ${reason === r ? "text-on-primary" : "text-on-surface-variant"}`}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <View className="gap-1">
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Type the reason for rejection"
                placeholderTextColor="#747775"
                multiline
                maxLength={MAX_LENGTH}
                autoFocus
                accessibilityLabel="Rejection reason"
                className="p-3 border border-outline rounded-xl bg-surface text-on-surface text-body-medium min-h-[90px]"
                style={{ textAlignVertical: "top" }}
              />
              <Text className="text-label-small text-on-surface-variant text-right">{reason.length}/{MAX_LENGTH}</Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="flex-1 py-3.5 rounded-full border border-outline items-center justify-center active:bg-surface-variant/30"
              >
                <Text className="font-semibold text-on-surface">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirm(trimmed)}
                disabled={!trimmed || isSubmitting}
                className={`flex-1 py-3.5 rounded-full items-center justify-center ${!trimmed || isSubmitting ? "bg-surface-variant" : "bg-error active:opacity-90"}`}
              >
                <Text className={`font-semibold ${!trimmed || isSubmitting ? "text-on-surface-variant" : "text-white"}`}>
                  {isSubmitting ? "Rejecting…" : "Reject"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
