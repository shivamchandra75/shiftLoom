import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/src/global.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationGuard() {
  const { user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[1] === 'onboarding';
    const inAppGroup = segments[0] === '(tabs)'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && ( !user.role || !user?.firstName ) && !inOnboarding) {
      router.replace('/(user)/onboarding');
    }else if(user && user.role && user.firstName && !inAppGroup){
      router.replace('/(tabs)')
    }
  }, [user, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized) {
    return null; // Return null (or splash screen) during initial session check
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
