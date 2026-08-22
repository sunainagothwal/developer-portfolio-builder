import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@store/authStore';
import { useSettingsStore } from '@store/settingsStore';
import { ROUTES } from '@constants/routes';

/**
 * Entry point.
 *
 * The landing screen is sign-in: the portfolio lives in the user's account, so
 * there is nothing meaningful to show until we know who they are. Once signed
 * in, a first-time user goes to resume upload; a returning one straight to the
 * dashboard.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboardingComplete);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'signedOut') return <Redirect href={ROUTES.login} />;

  return <Redirect href={onboardingComplete ? ROUTES.dashboard : ROUTES.resumeUpload} />;
}
