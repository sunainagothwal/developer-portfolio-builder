import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { useAppTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@store/settingsStore';
import { exportBackupToFile, shareBackupFile, pickAndParseBackupFile, restoreFromSnapshot } from '@lib/export/backupService';
import { formatFullDate } from '@utils/date';

export default function BackupScreen() {
  const theme = useAppTheme();
  const { settings, setLastBackupAt } = useSettingsStore();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      const fileUri = await exportBackupToFile();
      await shareBackupFile(fileUri);
      await setLastBackupAt(new Date().toISOString());
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setExporting(false);
    }
  };

  const onImport = async () => {
    Alert.alert(
      'Restore from backup',
      'This will replace all current data with the contents of the backup file. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const snapshot = await pickAndParseBackupFile();
              if (!snapshot) return;
              await restoreFromSnapshot(snapshot);
              Alert.alert('Restore complete', 'Your data has been restored. Restart the app to see all changes reflected everywhere.');
            } catch (e) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Invalid backup file');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Backup & Restore' }} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.lg }}>
        Your data lives only on this device. Export a JSON backup regularly so you never lose it, and restore it on a
        new device whenever you need to.
      </Text>

      <AppCard>
        <Text variant="titleMedium">Export backup</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: 12 }}>
          {settings.lastBackupAt
            ? `Last backup: ${formatFullDate(settings.lastBackupAt)}`
            : 'You have not backed up your data yet.'}
        </Text>
        <Button mode="contained" onPress={onExport} disabled={exporting} icon="cloud-upload-outline">
          {exporting ? 'Exporting…' : 'Export as JSON'}
        </Button>
        {exporting ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </AppCard>

      <AppCard>
        <Text variant="titleMedium">Restore from backup</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: 12 }}>
          Choose a previously exported JSON file to restore your data.
        </Text>
        <Button mode="outlined" onPress={onImport} disabled={importing} icon="cloud-download-outline">
          {importing ? 'Restoring…' : 'Import JSON backup'}
        </Button>
        {importing ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </AppCard>
    </Screen>
  );
}

