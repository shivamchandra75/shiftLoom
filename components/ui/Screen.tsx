import React from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation } from "@/src/theme/tokens";

// Page frame: surface-container background under the status bar. Content uses 16px side padding.
export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <SafeAreaView edges={["top"]} className={`flex-1 bg-surface-container ${className}`}>
      {children}
    </SafeAreaView>
  );
}

// Bottom action bar (Figma 230:2667): floats over scrolling content, so it is the one bar with a shadow.
// Give the scroll content bottom padding (~96) so the last item can scroll clear of it.
export function BottomActionBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[elevation.floating, { paddingBottom: 16 + insets.bottom }]}
      className="absolute bottom-0 left-0 right-0 flex-row items-center gap-2 rounded-t-xl bg-surface px-4 pt-4"
    >
      {children}
    </View>
  );
}
