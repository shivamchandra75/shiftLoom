import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/src/global.css';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { MaterialSymbolsRounded_400Regular } from '@expo-google-fonts/material-symbols-rounded/400Regular';
import { MaterialSymbolsRounded_400Regular_Filled } from '@expo-google-fonts/material-symbols-rounded/400Regular_Filled';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationGuard() {
  const { user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  // Survives the trip through login/onboarding. NavigationGuard stays mounted for that whole time.
  // shortcut: in memory only, so a link is lost if the app is killed mid-signup. Move to AsyncStorage if that happens.
  const pendingJobId = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const userRef = useRef(user);
  userRef.current = user;
  const launchLinkChecked = useRef(false);

  // Cold start from a shared link: the router can drop the launch URL or the guard below can redirect past it,
  // so read the launch URL once ourselves and open the job if the app didn't land there.
  useEffect(() => {
    if (!navigationState?.key || launchLinkChecked.current) return;
    launchLinkChecked.current = true;
    Linking.getInitialURL().then((url) => {
      const id = url?.match(/^https?:\/\/[^/]+\/job\/([^/?#]+)/)?.[1];
      const u = userRef.current;
      if (!id || pathnameRef.current.endsWith(`/${id}`)) return;
      if (!u) pendingJobId.current = id;
      else if (u.role === 'admin') router.push({ pathname: '/admin-job/[id]', params: { id } });
      else if (u.role && u.firstName) router.push({ pathname: '/job/[id]', params: { id } });
      else pendingJobId.current = id;
    }).catch(() => {});
  }, [navigationState?.key, router]);

  useEffect(() => {
    // On a cold start from a link, segments are empty until the router has read the URL. Redirecting then drops the link.
    if (!navigationState?.key) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[1] === 'onboarding';
    const inAppGroup = segments[0] === '(tabs)' || segments[0] === 'job' || segments[0] === 'notifications' || segments[0] === 'documents';
    const inAdminGroup = segments[0] === '(admin)' || segments[0] === 'admin-job' || segments[0] === 'admin-user' || segments[0] === 'notifications';

    const linkedJobId = pathname.match(/^\/job\/([^/]+)$/)?.[1] ?? null;
    const takePending = () => {
      const id = pendingJobId.current;
      pendingJobId.current = null;
      return id;
    };

    if (!user && !inAuthGroup) {
      pendingJobId.current = linkedJobId ?? pendingJobId.current;
      router.replace('/(auth)/login');
    } else if (user?.role === 'admin') {
      if (!inAdminGroup) {
        const id = linkedJobId ?? takePending();
        router.replace(id ? { pathname: '/admin-job/[id]', params: { id } } : '/(admin)');
      }
    } else if (user && ( !user.role || !user?.firstName ) && !inOnboarding) {
      pendingJobId.current = linkedJobId ?? pendingJobId.current;
      router.replace('/(user)/onboarding');
    }else if(user && user.role && user.firstName && !inAppGroup){
      const id = takePending();
      if (id) router.replace({ pathname: '/job/[id]', params: { id } }, { withAnchor: true });
      else router.replace('/(tabs)');
    }
  }, [user, segments, pathname, navigationState?.key]);

  usePushNotifications(user?.id);

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
        <Stack.Screen name="notifications" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </KeyboardProvider>
  );
}
