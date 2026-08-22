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
import { useAchievementsStore } from '@store/achievementsStore';
import { ROUTES } from '@constants/routes';
import { formatDate, sortByDateDesc } from '@utils/date';
import { ACHIEVEMENT_CATEGORY_OPTIONS } from '@lib/validators/achievementSchema';

export default function AchievementsListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useAchievementsStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = sortByDateDesc(items, (a) => a.date);

  return (
    <Screen
      floatingAction={
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push(ROUTES.achievementForm())}
        />
      }
    >
      <Stack.Screen options={{ title: 'Achievements' }} />
      {!loaded ? (
        <SkeletonList count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No achievements yet"
          description="Log awards, publications, talks, and competition wins."
          actionLabel="Add achievement"
          onAction={() => router.push(ROUTES.achievementForm())}
        />
      ) : (
        sorted.map((item) => (
          <AppCard key={item.id} onPress={() => router.push(ROUTES.achievementForm(item.id))}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{item.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDate(item.date)}
                </Text>
              </View>
              <Badge label={ACHIEVEMENT_CATEGORY_OPTIONS.find((o) => o.value === item.category)?.label ?? item.category} tone="primary" />
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
