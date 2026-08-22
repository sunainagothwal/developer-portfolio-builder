import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useInterviewStore } from '@store/interviewStore';
import { ROUTES } from '@constants/routes';
import { formatDate } from '@utils/date';
import { INTERVIEW_STAGE_OPTIONS, INTERVIEW_STAGE_TONE } from '@lib/validators/interviewSchema';

export default function InterviewsListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useInterviewStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(
    () => items.filter((i) => !['rejected', 'withdrawn', 'accepted'].includes(i.stage)).length,
    [items]
  );

  const sorted = [...items].sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));

  return (
    <Screen
      floatingAction={
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push(ROUTES.interviewForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Interview Tracker' }} />
      {loaded && items.length > 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          {activeCount} active application{activeCount !== 1 ? 's' : ''} of {items.length} total
        </Text>
      ) : null}
      {!loaded ? (
        <SkeletonList count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="account-tie-voice-outline"
          title="No applications tracked"
          description="Track every job application from apply to offer."
          actionLabel="Add application"
          onAction={() => router.push(ROUTES.interviewForm())}
        />
      ) : (
        sorted.map((entry) => (
          <AppCard key={entry.id} onPress={() => router.push(ROUTES.interviewForm(entry.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{entry.role}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {entry.company}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Applied {formatDate(entry.appliedDate)}
                </Text>
              </View>
              <Badge
                label={INTERVIEW_STAGE_OPTIONS.find((o) => o.value === entry.stage)?.label ?? entry.stage}
                tone={INTERVIEW_STAGE_TONE[entry.stage]}
              />
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  fab: { position: 'absolute', right: 20, bottom: 24 },
});
