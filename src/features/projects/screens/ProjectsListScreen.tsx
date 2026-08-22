import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, FlatList } from 'react-native';
import { Text, FAB, Chip } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { SearchField } from '@components/common/SearchField';
import { PageHeader } from '@components/common/PageHeader';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProjectsStore } from '@store/projectsStore';
import { ROUTES } from '@constants/routes';
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_TONE } from '@lib/validators/projectSchema';

export default function ProjectsListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useProjectsStore();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(
        (p) => p.title.toLowerCase().includes(needle) || p.summary.toLowerCase().includes(needle),
      )
      .filter((p) => !statusFilter || p.status === statusFilter)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt));
  }, [items, query, statusFilter]);

  const isFiltered = Boolean(query.trim()) || statusFilter !== null;

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      {/* The screen draws its own header. The navigator's would add the
          status-bar inset a second time, opening a gap above the search. */}
      <Stack.Screen options={{ title: 'Projects', headerShown: false }} />

      <View style={{ paddingHorizontal: theme.custom.spacing.lg, paddingTop: theme.custom.spacing.md }}>
        <PageHeader title="Projects" />
        <SearchField
          placeholder="Search projects"
          value={query}
          onChangeText={setQuery}
          style={{ marginBottom: theme.custom.spacing.md }}
        />
        <View style={styles.filterRow}>
          {PROJECT_STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={statusFilter === opt.value}
              onPress={() => setStatusFilter(statusFilter === opt.value ? null : opt.value)}
              style={{ marginRight: 6, marginBottom: 6 }}
              compact
            >
              {opt.label}
            </Chip>
          ))}
        </View>
      </View>

      {!loaded ? (
        <View style={{ paddingHorizontal: theme.custom.spacing.lg }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          // A real list. The cards used to sit in a fixed-height View, so
          // anything past the first screenful could not be reached.
          style={styles.list}
          contentContainerStyle={[
            {
              paddingHorizontal: theme.custom.spacing.lg,
              // Clears the FAB so the last card is never trapped beneath it.
              paddingBottom: theme.custom.spacing.huge * 2,
            },
            filtered.length === 0 && styles.emptyContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item: project }) => (
            <AppCard onPress={() => router.push(ROUTES.projectDetail(project.id))}>
              <View style={styles.row}>
                {project.images[0] ? (
                  <Image
                    source={{ uri: project.images[0] }}
                    style={[styles.thumb, { borderRadius: theme.custom.radius.sm }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      styles.thumbPlaceholder,
                      { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.custom.radius.sm },
                    ]}
                  />
                )}
                <View style={{ flex: 1, marginLeft: theme.custom.spacing.md }}>
                  <View style={styles.titleRow}>
                    <Text variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
                      {project.title}
                    </Text>
                    {project.featured ? <Text style={{ marginLeft: 4 }}>⭐</Text> : null}
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                    {project.summary}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={PROJECT_STATUS_OPTIONS.find((o) => o.value === project.status)?.label ?? project.status}
                      tone={PROJECT_STATUS_TONE[project.status]}
                      small
                    />
                  </View>
                </View>
              </View>
            </AppCard>
          )}
          ListEmptyComponent={
            isFiltered ? (
              <EmptyState
                icon="magnify"
                title="No matching projects"
                description="Nothing here matches your search and filter."
                actionLabel="Clear filters"
                onAction={() => {
                  setQuery('');
                  setStatusFilter(null);
                }}
              />
            ) : (
              <EmptyState
                icon="folder-outline"
                title="No projects yet"
                description="Showcase the work you're proud of — side projects, freelance, or professional."
                actionLabel="Add your first project"
                onAction={() => router.push(ROUTES.projectForm())}
              />
            )
          }
        />
      )}

      <FAB
        icon="plus"
        accessibilityLabel="Add project"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push(ROUTES.projectForm())}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  thumb: { width: 56, height: 56 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap' },

  list: { flex: 1 },
  // Lets the empty state centre itself in the remaining space.
  emptyContent: { flexGrow: 1, justifyContent: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 24 },
});
