import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useAppTheme } from '@theme/ThemeProvider';
import { useAuthStore } from '@store/authStore';
import { useSettingsStore } from '@store/settingsStore';
import { ROUTES } from '@constants/routes';
import { GoogleSignInButton } from '@features/auth/components/GoogleSignInButton';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { login, register, loginWithGoogle } = useAuthStore();
  const onboardingComplete = useSettingsStore((s) => s.settings.onboardingComplete);

  /**
   * Signing in changes the auth store, but this screen is already mounted, so
   * nothing moves unless it says so. Without this the account was created and
   * the user was left staring at the form.
   */
  const goToApp = () => {
    router.replace(onboardingComplete ? ROUTES.dashboard : ROUTES.resumeUpload);
  };

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const submit = async () => {
    setError(null);

    if (!email.trim() || !password) return setError('Email and password are required.');
    if (isSignUp && !name.trim()) return setError('Please enter your name.');
    // Matches the backend's own minimum, so the failure is caught here rather
    // than after a round trip.
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setBusy(true);
    try {
      if (isSignUp) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      goToApp();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  };

  const onGoogleToken = async (idToken: string) => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle(idToken);
      goToApp();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View
              style={[
                styles.logo,
                { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.custom.radius.xl },
              ]}
            >
              <MaterialCommunityIcons
                name="briefcase-variant"
                size={36}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <Text variant="headlineMedium" style={styles.title}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              {isSignUp
                ? 'Your portfolio is saved to your account, so nothing is lost if you reinstall.'
                : 'Sign in to load your portfolio.'}
            </Text>
          </View>

          {isSignUp ? (
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              autoCapitalize="words"
              autoComplete="name"
              style={styles.field}
            />
          ) : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.field}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            style={styles.field}
          />

          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={submit}
            loading={busy}
            disabled={busy}
            style={styles.submit}
          >
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>

          <View style={styles.dividerRow}>
            <Divider style={styles.flex} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 12 }}>
              or
            </Text>
            <Divider style={styles.flex} />
          </View>

          <GoogleSignInButton onToken={onGoogleToken} onError={setError} disabled={busy} />

          <Button
            onPress={() => {
              setMode(isSignUp ? 'signIn' : 'signUp');
              setError(null);
            }}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {isSignUp ? 'I already have an account' : 'Create an account'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', marginTop: 16, textAlign: 'center' },
  subtitle: { marginTop: 6, textAlign: 'center' },
  field: { marginBottom: 12 },
  submit: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
});
