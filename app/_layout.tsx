import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/src/global.css';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { MaterialSymbolsRounded_400Regular } from '@expo-google-fonts/material-symbols-rounded/400Regular';
import { MaterialSymbolsRounded_400Regular_Filled } from '@expo-google-fonts/material-symbols-rounded/400Regular_Filled';

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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    MaterialSymbolsRounded_400Regular,
    MaterialSymbolsRounded_400Regular_Filled,
  });

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized || !fontsLoaded) {
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
        <Stack.Screen name="job/[id]" />
        <Stack.Screen name="admin-job/new" />
        <Stack.Screen name="admin-user/[id]" />
        <Stack.Screen name="admin-job/[id]" />
        <Stack.Screen name="documents" />
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
