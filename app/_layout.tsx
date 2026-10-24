import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/src/global.css';
import { KeyboardProvider } from 'react-native-keyboard-controller';
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
    const inAppGroup = segments[0] === '(tabs)' || segments[0] === 'job' || segments[0] === 'notifications' || segments[0] === 'documents';
    const inAdminGroup = segments[0] === '(admin)' || segments[0] === 'admin-job' || segments[0] === 'admin-user';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user?.role === 'admin') {
      if (!inAdminGroup) router.replace('/(admin)');
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
    <KeyboardProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="job/[id]"
          options={{
            headerShown: true,
            title: "Shift Details"
          }}
        />
        <Stack.Screen name="admin-job/new"
          options={{
            headerShown: true,
            title: "Post a Job"
          }}
        />
        <Stack.Screen name="admin-user/[id]"
          options={{
            headerShown: true,
            title: "Review Worker"
          }}
        />
        <Stack.Screen name="admin-job/[id]"
          options={{
            headerShown: true,
            title: "Job Details"
          }}
        />
        <Stack.Screen
          name="documents"
          options={{
            headerShown: true,
            title: "Verification Documents"
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: "Notifications"
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </KeyboardProvider>
  );
}
