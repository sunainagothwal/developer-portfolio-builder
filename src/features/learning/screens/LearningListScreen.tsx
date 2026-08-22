import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB, ProgressBar } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useLearningStore } from '@store/learningStore';
import { ROUTES } from '@constants/routes';
import { LEARNING_STATUS_OPTIONS, LEARNING_STATUS_TONE, LEARNING_TYPE_OPTIONS } from '@lib/validators/learningSchema';

export default function LearningListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useLearningStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Screen
      floatingAction={
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push(ROUTES.learningForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Learning Tracker' }} />
      {!loaded ? (
        <SkeletonList count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="book-open-page-variant-outline"
          title="Nothing tracked yet"
          description="Add courses, books, or videos you're working through."
          actionLabel="Add learning item"
          onAction={() => router.push(ROUTES.learningForm())}
        />
      ) : (
        sorted.map((item) => (
          <AppCard key={item.id} onPress={() => router.push(ROUTES.learningForm(item.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{item.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {LEARNING_TYPE_OPTIONS.find((o) => o.value === item.type)?.label}
                  {item.source ? ` · ${item.source}` : ''}
                </Text>
              </View>
              <Badge
                label={LEARNING_STATUS_OPTIONS.find((o) => o.value === item.status)?.label ?? item.status}
                tone={LEARNING_STATUS_TONE[item.status]}
              />
            </View>
            <ProgressBar
              progress={item.progress / 100}
              color={theme.colors.primary}
              style={{ height: 6, borderRadius: 3, marginTop: 10 }}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {item.progress}% complete
            </Text>
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
