import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useCertificatesStore } from '@store/certificatesStore';
import { ROUTES } from '@constants/routes';
import { formatDate, sortByDateDesc } from '@utils/date';

export default function CertificatesListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useCertificatesStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = sortByDateDesc(items, (c) => c.issueDate);

  return (
    <Screen
      floatingAction={
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push(ROUTES.certificateForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Certificates' }} />
      {!loaded ? (
        <SkeletonList count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="certificate-outline"
          title="No certificates yet"
          description="Track certifications and credentials you've earned."
          actionLabel="Add certificate"
          onAction={() => router.push(ROUTES.certificateForm())}
        />
      ) : (
        sorted.map((cert) => (
          <AppCard key={cert.id} onPress={() => router.push(ROUTES.certificateForm(cert.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{cert.name}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {cert.issuingOrg}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Issued {formatDate(cert.issueDate)}
                  {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ''}
                </Text>
              </View>
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24 },
});
