import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useEducationStore } from '@store/educationStore';
import { ROUTES } from '@constants/routes';
import { formatDate, sortByDateDesc } from '@utils/date';

export default function EducationListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useEducationStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = sortByDateDesc(items, (e) => e.startDate);

  return (
    <Screen
      floatingAction={
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push(ROUTES.educationForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Education' }} />
      {!loaded ? (
        <SkeletonList count={3} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="No education added"
          description="Add your degrees, diplomas, and courses."
          actionLabel="Add education"
          onAction={() => router.push(ROUTES.educationForm())}
        />
      ) : (
        sorted.map((edu) => (
          <AppCard key={edu.id} onPress={() => router.push(ROUTES.educationForm(edu.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{edu.degree}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {edu.institution}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDate(edu.startDate)} — {edu.isCurrent ? 'Present' : formatDate(edu.endDate)}
                </Text>
              </View>
              {edu.isCurrent ? <Badge label="Ongoing" tone="success" /> : null}
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
