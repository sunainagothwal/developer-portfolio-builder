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
import { useExperienceStore } from '@store/experienceStore';
import { ROUTES } from '@constants/routes';
import { formatDate, sortByDateDesc, durationBetween } from '@utils/date';

export default function ExperienceListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useExperienceStore();

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
          onPress={() => router.push(ROUTES.experienceForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Work Experience' }} />
      {!loaded ? (
        <SkeletonList count={3} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No experience added"
          description="Add the roles that shaped your career."
          actionLabel="Add experience"
          onAction={() => router.push(ROUTES.experienceForm())}
        />
      ) : (
        sorted.map((exp) => (
          <AppCard key={exp.id} onPress={() => router.push(ROUTES.experienceForm(exp.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{exp.role}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {exp.company}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDate(exp.startDate)} — {exp.isCurrent ? 'Present' : formatDate(exp.endDate)} ·{' '}
                  {durationBetween(exp.startDate, exp.isCurrent ? undefined : exp.endDate)}
                </Text>
                {exp.techStack.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {exp.techStack.slice(0, 4).map((t) => (
                      <Badge key={t} label={t} tone="neutral" small style={{ marginRight: 4, marginTop: 4 }} />
                    ))}
                  </View>
                ) : null}
              </View>
              {exp.isCurrent ? <Badge label="Current" tone="success" /> : null}
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  fab: { position: 'absolute', right: 20, bottom: 24 },
});
