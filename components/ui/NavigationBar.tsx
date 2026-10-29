import React from "react";
import { Pressable, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

// Navigation bar/Worker and Navigation bar/Admin (Figma 221:2477, 255:3037).
// Use as the Tabs tabBar: tabBar={(p) => <NavigationBar {...p} icons={{ index: "home", ... }} />}
export function NavigationBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: Record<string, string> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingBottom: 16 + insets.bottom }} className="flex-row bg-surface px-4 pt-3 border-t-[0.5px] border-t-surface-container-highest">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            className="flex-1 items-center gap-1"
          >
            <View className="h-8 w-16 items-center justify-center">
              {/* Android drops the corner radius when a background is added after mount, so the pill
                  always exists and only its opacity changes */}
              <View
                pointerEvents="none"
                className="absolute inset-0 rounded-full bg-primary-container"
                style={{ opacity: focused ? 1 : 0 }}
              />
              <Icon name={icons[route.name] ?? "circle"} color={focused ? "on-primary-container" : "on-surface-variant"} />
            </View>
            <Text variant="label-medium" color={focused ? "on-surface" : "on-surface-variant"}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
