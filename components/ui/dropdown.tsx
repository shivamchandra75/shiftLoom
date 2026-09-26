import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TouchableWithoutFeedback } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  error = "",
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // M3 styling determinations
  const hasError = !!error;
  const labelColor = hasError
    ? "text-error"
    : isOpen
    ? "text-primary"
    : "text-on-surface-variant";

  const borderColor = hasError
    ? "border-error"
    : isOpen
    ? "border-primary"
    : "border-outline-variant";

  // Find the selected option to display its label
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className={`w-full gap-1.5 ${className}`}>
      {/* Label */}
      <Text className={`text-label-medium font-semibold ${labelColor} ml-1`}>
        {label}
      </Text>

      {/* Select Box (Looks like an input) */}
      <Pressable
        onPress={() => setIsOpen(true)}
        className={`w-full border rounded-2xl px-4 py-3 min-h-[56px] flex-row items-center justify-between ${borderColor} bg-surface`}
      >
        <Text
          className={`text-body-large ${
            selectedOption ? "text-on-surface" : "text-outline-variant"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={24}
          color={hasError ? "var(--error)" : "var(--on-surface-variant)"}
        />
      </Pressable>

      {/* Integrated Error message */}
      {hasError ? (
        <Text className="text-label-small text-error ml-2 mt-0.5">
          {error}
        </Text>
      ) : null}

      {/* Modal for Options List */}
      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View className="flex-1 justify-end bg-on-background/40">
            <TouchableWithoutFeedback>
              <View className="bg-surface rounded-t-3xl pt-6 pb-8 max-h-[70%]">
                <View className="px-6 pb-4 border-b border-outline-variant mb-2">
                  <Text className="text-title-large text-on-surface font-bold">
                    Select {label}
                  </Text>
                </View>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <Pressable
                        onPress={() => {
                          onSelect(item.value);
                          setIsOpen(false);
                        }}
                        className={`px-6 py-4 flex-row justify-between items-center ${
                          isSelected ? "bg-primary/10" : "active:bg-surface-variant"
                        }`}
                      >
                        <Text
                          className={`text-body-large ${
                            isSelected ? "text-primary font-bold" : "text-on-surface"
                          }`}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <MaterialCommunityIcons
                            name="check"
                            size={20}
                            color="var(--primary)"
                          />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
