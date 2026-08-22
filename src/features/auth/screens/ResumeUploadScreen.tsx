import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, HelperText, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useAppTheme } from '@theme/ThemeProvider';
import { useAuthStore } from '@store/authStore';
import { useSettingsStore } from '@store/settingsStore';
import { extractResumeText } from '@lib/import/resumeTextExtractor';
import { parseResumeText, hasUsefulData } from '@lib/import/resumeParser';
import { importResumeSections } from '@lib/import/resumeImportService';
import { ROUTES } from '@constants/routes';

/**
 * The step straight after sign-in: bring in a resume so the app has something
 * to work with. Skippable, because an existing account has its portfolio
 * already restored from the server by this point.
 */
export default function ResumeUploadScreen() {
  const theme = useAppTheme();
  const { syncNow, user } = useAuthStore();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    await completeOnboarding();
    router.replace(ROUTES.dashboard);
  };

  const pickResume = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setBusy(true);

      const extraction = await extractResumeText(asset.uri, asset.name ?? '');
      if (!extraction.text.trim()) {
        setError(extraction.warning ?? 'Could not read any text from that PDF.');
        return;
      }

      const parsed = parseResumeText(extraction.text);
      if (!hasUsefulData(parsed)) {
        setError("Read the file, but couldn't recognise any details in it.");
        return;
      }

      const summary = await importResumeSections(parsed, {
        education: true,
        certificates: true,
        projects: true,
        skills: true,
        experience: true,
        achievements: true,
      });

      // Get it onto the server before anything else can go wrong with the
      // device; this is the point of signing in.
      try {
        await syncNow();
      } catch {
        /* offline: the next successful sync will carry it up */
      }

      const added = [
        summary.skills ? `${summary.skills} skills` : null,
        summary.experience ? `${summary.experience} experience entries` : null,
        summary.education ? `${summary.education} education entries` : null,
        summary.projects ? `${summary.projects} projects` : null,
        summary.certificates ? `${summary.certificates} certificates` : null,
        summary.achievements ? `${summary.achievements} achievements` : null,
      ].filter(Boolean);

      Alert.alert(
        'Resume imported',
        [
          added.length ? `Added:\n${added.join('\n')}` : 'No new entries were added.',
          summary.missingDates
            ? `\n${summary.missingDates} entr${summary.missingDates === 1 ? 'y' : 'ies'} had no date in the resume — you can add them in Manage.`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        [{ text: 'Continue', onPress: () => void finish() }],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong reading that file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View
          style={[
            styles.icon,
            { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.custom.radius.xl },
          ]}
        >
          <MaterialCommunityIcons
            name="file-upload-outline"
            size={40}
            color={theme.colors.onPrimaryContainer}
          />
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Upload your resume'}
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Upload a PDF and we'll fill in your skills, experience, education, projects and
          certificates. You can edit everything afterwards.
        </Text>

        {busy ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}

        {error ? (
          <HelperText type="error" visible style={{ textAlign: 'center' }}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={pickResume}
          disabled={busy}
          style={styles.action}
        >
          {busy ? 'Reading…' : 'Choose PDF'}
        </Button>

        <Button onPress={finish} disabled={busy} style={{ marginTop: 8 }}>
          Skip for now
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', marginTop: 20, textAlign: 'center' },
  subtitle: { marginTop: 8, textAlign: 'center' },
  action: { marginTop: 28, alignSelf: 'stretch' },
});
