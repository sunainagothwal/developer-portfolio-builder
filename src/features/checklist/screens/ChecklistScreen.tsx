import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Checkbox, ProgressBar } from 'react-native-paper';
import { Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useChecklistStore } from '@store/checklistStore';

export default function ChecklistScreen() {
  const theme = useAppTheme();
  const { items, loaded, load, toggle } = useChecklistStore();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      groups[item.category] = groups[item.category] ?? [];
      groups[item.category].push(item);
    }
    return groups;
  }, [items]);

  const progress = items.length ? items.filter((i) => i.done).length / items.length : 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Portfolio Checklist' }} />
      {!loaded ? (
        <SkeletonList count={5} />
      ) : (
        <>
          <AppCard>
            <Text variant="titleMedium">{Math.round(progress * 100)}% portfolio-ready</Text>
            <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progress} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              {items.filter((i) => i.done).length} of {items.length} tasks complete
            </Text>
          </AppCard>

          {Object.entries(grouped).map(([category, catItems]) => (
            <View key={category} style={{ marginBottom: theme.custom.spacing.md }}>
              <Text variant="labelLarge" style={{ opacity: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
                {category}
              </Text>
              {catItems.map((item) => (
                <AppCard key={item.id} onPress={() => toggle(item.id, !item.done)}>
                  <View style={styles.row}>
                    <Checkbox status={item.done ? 'checked' : 'unchecked'} onPress={() => toggle(item.id, !item.done)} />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <Text
                        variant="bodyLarge"
                        style={{ textDecorationLine: item.done ? 'line-through' : 'none', opacity: item.done ? 0.6 : 1 }}
                      >
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </AppCard>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  progress: { height: 8, borderRadius: 4, marginTop: 10 },
});
