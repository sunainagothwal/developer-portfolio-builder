import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Text, List, SegmentedButtons } from 'react-native-paper';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { SectionHeader } from '@components/common/SectionHeader';
import { useAppTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@store/settingsStore';
import { useAuthStore } from '@store/authStore';
import { ROUTES } from '@constants/routes';
import { router } from 'expo-router';
import type { ThemeMode } from '@models/models';

/** System first, because it is the default. */
const THEME_MODES: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { settings, setThemeMode } = useSettingsStore();
  const { user, logout, syncNow } = useAuthStore();
  const [busy, setBusy] = useState(false);

  const onSignOut = () => {
    Alert.alert(
      'Sign out',
      'Your portfolio is saved to your account first, so nothing is lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await logout();
              router.replace(ROUTES.login);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onSyncNow = async () => {
    setBusy(true);
    try {
      await syncNow();
      Alert.alert('Synced', 'Your portfolio is saved to your account.');
    } catch (e) {
      Alert.alert('Could not sync', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <Text
        variant="headlineMedium"
        style={{
          fontWeight: '700',
          textAlign: 'center',
          marginTop: theme.custom.spacing.md,
          marginBottom: theme.custom.spacing.lg,
        }}
      >
        Settings
      </Text>

      <SectionHeader title="Appearance" />
      <AppCard>
        {/* One control for the whole of theming. Presets, compact mode and the
            biometric lock were removed. */}
        <Text variant="titleSmall" style={{ marginBottom: 12 }}>
          Theme
        </Text>
        <SegmentedButtons
          value={settings.themeMode}
          onValueChange={(value) => setThemeMode(value as ThemeMode)}
          buttons={THEME_MODES}
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
          System follows your device appearance.
        </Text>
      </AppCard>

      <SectionHeader title="Account" />
      <AppCard>
        <List.Item
          title={user?.name ?? 'Signed in'}
          description={user?.email ?? 'Your data is saved to your account'}
          left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
        />
        <List.Item
          title="Sync now"
          description="Save everything to your account"
          left={(props) => <List.Icon {...props} icon="cloud-sync-outline" />}
          onPress={busy ? undefined : onSyncNow}
        />
        <List.Item
          title="Sign out"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={busy ? undefined : onSignOut}
        />
      </AppCard>

      <SectionHeader title="About" />
      <AppCard>
        <List.Item
          title="Developer Portfolio Builder"
          description="Version 1.0.0"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
        />
      </AppCard>
    </Screen>
  );
}

