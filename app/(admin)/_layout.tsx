import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons size={28} name={focused ? "home" : "home-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="verification"
        options={{
          headerShown: true,
          title: 'Verification',
          tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons size={24} name={focused ? "shield-check" : "shield-check-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          headerShown: true,
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons size={24} name={focused ? "bookmark" : "bookmark-outline"} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons size={24} name={focused ? "account" : "account-outline"} color={color} />,
        }}
      />
    </Tabs>
  );
}
