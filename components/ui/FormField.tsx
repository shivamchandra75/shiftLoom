import React, { useState } from "react";
import { Pressable, TextInput, TextInputProps, View } from "react-native";
import { colors } from "@/src/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

export interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  leadingIcon?: string;
  /** Static text before the input, e.g. "₹". */
  prefix?: string;
  keyboardType?: TextInputProps["keyboardType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  editable?: boolean;
  /** Makes the field a button (select, date, time): shows value or placeholder instead of an input. */
  onPress?: () => void;
  trailingIcon?: string;
  fieldRef?: React.Ref<View>;
}

// Form field (Figma 253:2847): label above, 56px field. Error replaces the helper text, adds an error
// icon and a 2px error border. Validate when the user taps Next; clear the error as soon as they edit.
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  leadingIcon,
  prefix,
  keyboardType,
  returnKeyType,
  autoCapitalize,
  editable = true,
  onPress,
  trailingIcon,
  fieldRef,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const labelColor = error ? "error" : focused ? "primary" : "on-surface-variant";
  const border = error ? "border-error" : focused ? "border-primary" : "border-outline";
  const fieldClass = `h-14 flex-row items-center gap-3 rounded-lg bg-surface px-4 ${error || focused ? "border-2" : "border"} ${border}`;

  const content = (
    <>
      {leadingIcon && <Icon name={leadingIcon} size={20} />}
      {prefix && <Text variant="body-large" color="on-surface-variant">{prefix}</Text>}
      {onPress ? (
        <Text variant="body-large" color={value ? "on-surface" : "on-surface-variant"} numberOfLines={1} className="flex-1">
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors["on-surface-variant"]}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          className="flex-1 font-inter text-body-large text-on-surface"
        />
      )}
      {error ? <Icon name="error" size={20} color="error" /> : trailingIcon ? <Icon name={trailingIcon} /> : null}
    </>
  );

  return (
    <View className="gap-2">
      <Text variant="title-small" color={labelColor}>{label}</Text>
      {onPress ? (
        <Pressable ref={fieldRef} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value || "not set"}`} className={fieldClass}>
          {content}
        </Pressable>
      ) : (
        <View ref={fieldRef} className={fieldClass}>{content}</View>
      )}
      {error ? (
        <View className="flex-row items-center gap-1 px-1">
          <Icon name="error" size={16} color="error" />
          <Text variant="body-small" color="error" className="flex-1">{error}</Text>
        </View>
      ) : helper ? (
        <Text variant="body-small" color="on-surface-variant" className="px-1">{helper}</Text>
      ) : null}
    </View>
  );
}
