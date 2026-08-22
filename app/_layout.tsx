import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppThemeProvider, useAppTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@store/settingsStore';
import { initDatabase } from '@lib/db/database';
import { useProfileStore } from '@store/profileStore';
import { useAuthStore } from '@store/authStore';
import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { View, Text } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop: splash may already be hidden in some environments */
});

/** Routes presented as modals. Declared here, not inside the screens. */
const FORM_ROUTES = [
  'projects/form',
  'education/form',
  'achievements/form',
  'certificates/form',
  'experience/form',
  'interviews/form',
  'learning/form',
] as const;

/**
 * Forms that draw their own header instead of the stack's.
 *
 * `headerShown` is a screen option, but it is set here alongside
 * `presentation` so the whole navigator configuration for a route lives in one
 * place — and so toggling it can never re-configure the navigator mid-render.
 * The screen supplies its own title and close control.
 */
const SELF_HEADED_FORM_ROUTES = ['skills/form'] as const;

function RootStackNavigator() {
  const theme = useAppTheme();
  return (
    <>
      <StatusBar style={theme.custom.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: { fontWeight: '700' },
          // iOS centres titles already; Android left-aligns them. Setting it
          // explicitly keeps every screen's title in the same place.
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: theme.colors.background },
          // The back button defaults to labelling itself with the previous
          // route's name. That route is the tab group, so every pushed screen
          // showed a literal "(tabs)" next to the chevron. "minimal" drops the
          // label and keeps the chevron.
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        {/* Sign-in and the resume step draw their own headers. */}
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="resume-upload" options={{ headerShown: false }} />
        {/* `presentation` is navigator-level config, so it must be declared
            statically here. Setting it from inside a screen via <Stack.Screen
            options={{...}}> re-configures the navigator on every render, which
            re-renders the screen and loops until React throws
            "Maximum update depth exceeded". Screens set only `title`. */}
        {FORM_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
        ))}
        {SELF_HEADED_FORM_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'modal', headerShown: false }} />
        ))}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const loadProfile = useProfileStore((s) => s.load);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    // Watchdog: if any startup step hangs, still render so the user gets a
    // usable screen instead of an indefinitely blank one behind the splash.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        console.warn('[boot] startup exceeded 10s — rendering anyway');
        setReady(true);
        SplashScreen.hideAsync().catch(() => undefined);
      }
    }, 10000);

    async function bootstrap() {
      try {
        console.log('[boot] 1/3 initDatabase…');
        await initDatabase();
        console.log('[boot] 2/3 database ready, hydrating stores…');
        await Promise.all([hydrateSettings(), loadProfile(), hydrateAuth()]);
        console.log('[boot] 3/3 stores hydrated');
      } catch (e) {
        console.error('[boot] startup failed:', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to initialize the app');
      } finally {
        clearTimeout(watchdog);
        if (!cancelled) setReady(true);
        // Belt-and-braces: onLayout normally hides the splash, but if the tree
        // below never mounts, this guarantees the overlay still comes down.
        SplashScreen.hideAsync().catch(() => undefined);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [hydrateSettings, loadProfile, hydrateAuth]);

  // Hide the splash once the root view has actually laid out. Doing this here
  // (rather than in bootstrap) guarantees there is something rendered
  // underneath before the native splash overlay is torn down — if this never
  // runs, the overlay stays on top and silently swallows every touch.
  const onLayout = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      console.log('[layout] splash hidden — touches enabled');
    } catch (e) {
      console.warn('[layout] SplashScreen.hideAsync() failed:', e);
    }
  }, []);

  if (!ready) return null;

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Something went wrong on startup</Text>
        <Text style={{ color: '#888', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <ErrorBoundary>
        <AppThemeProvider>
          <RootStackNavigator />
        </AppThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
