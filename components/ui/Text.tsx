import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { colors, typography } from "@/src/theme/tokens";

export type TextVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorToken;
  className?: string;
}

// Every text style comes from the SL type scale in src/theme/tokens.js.
export function Text({ variant = "body-medium", color = "on-surface", className = "", ...rest }: TextProps) {
  return <RNText className={`text-${variant} font-${typography[variant].font} text-${color} ${className}`} {...rest} />;
}
