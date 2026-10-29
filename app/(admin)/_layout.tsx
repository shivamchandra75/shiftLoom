import { Tabs } from 'expo-router';
import React from 'react';
import { NavigationBar } from '@/components/ui/NavigationBar';

const ICONS = { index: 'home', verification: 'verified_user', saved: 'bookmark', profile: 'person' };

export default function AdminTabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NavigationBar {...props} icons={ICONS} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="verification" options={{ title: 'Verification' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
