import { Tabs } from 'expo-router';
import React from 'react';
import { NavigationBar } from '@/components/ui/NavigationBar';

const ICONS = { index: 'home', 'my shifts': 'work', saved: 'bookmark', profile: 'person' };

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NavigationBar {...props} icons={ICONS} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="my shifts" options={{ title: 'My shifts' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
