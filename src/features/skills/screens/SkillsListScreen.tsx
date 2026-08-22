import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ScrollView, Alert } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { SearchField } from '@components/common/SearchField';
import { PageHeader } from '@components/common/PageHeader';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useSkillsStore } from '@store/skillsStore';
import { ROUTES } from '@constants/routes';
import { SKILL_CATEGORY_OPTIONS } from '@lib/validators/skillSchema';
import type { Skill, SkillCategory, SkillLevel } from '@models/models';

/** Matches the tone vocabulary Projects uses for its status badges. */
const LEVEL_TONE: Record<SkillLevel, 'neutral' | 'info' | 'primary' | 'success'> = {
  beginner: 'neutral',
  intermediate: 'info',
  advanced: 'primary',
  expert: 'success',
};

/** Proficiency as a number, for sorting. */
const LEVEL_RANK: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/** Stands in for the project thumbnail, so both lists share one silhouette. */
const CATEGORY_ICON: Record<SkillCategory, keyof typeof MaterialCommunityIcons.glyphMap> = {
  language: 'code-tags',
  framework: 'layers-triple-outline',
  database: 'database-outline',
  devops: 'cloud-cog-outline',
  design: 'palette-outline',
  'soft-skill': 'account-heart-outline',
  tool: 'wrench-outline',
  other: 'shape-outline',
};

const CATEGORY_LABEL = new Map(SKILL_CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

const LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export default function SkillsListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load, remove } = useSkillsStore();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Search first, so the chip counts describe what a chip would actually show. */
  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        (CATEGORY_LABEL.get(s.category) ?? '').toLowerCase().includes(needle),
    );
  }, [items, query]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<SkillCategory, number>();
    for (const s of searched) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return counts;
  }, [searched]);

  const filtered = useMemo(
    () =>
      searched
        .filter((s) => !categoryFilter || s.category === categoryFilter)
        // Featured first, then strongest, then alphabetical — the same shape as
        // Projects, which puts featured first and then orders by recency.
        .sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
            a.name.localeCompare(b.name),
        ),
    [searched, categoryFilter],
  );

  /** Only categories that actually hold something get a chip. */
  const chips = useMemo(
    () =>
      SKILL_CATEGORY_OPTIONS.map((o) => ({
        value: o.value as SkillCategory,
        label: o.label,
        count: countsByCategory.get(o.value as SkillCategory) ?? 0,
      })).filter((chip) => chip.count > 0),
    [countsByCategory],
  );

  const confirmRemove = useCallback(
    (skill: Skill) => {
      // A long press used to delete outright, with no undo.
      Alert.alert('Delete skill', `Remove "${skill.name}" from your skills?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(skill.id) },
      ]);
    },
    [remove],
  );

  const isFiltered = Boolean(query.trim()) || categoryFilter !== null;

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      {/* The screen draws its own header. The navigator's would add the
          status-bar inset a second time, opening a gap above the search. */}
      <Stack.Screen options={{ title: 'Skills', headerShown: false }} />

      <View style={{ paddingHorizontal: theme.custom.spacing.lg, paddingTop: theme.custom.spacing.md }}>
        <PageHeader title="Skills" />
        <SearchField
          placeholder="Search skills"
          value={query}
          onChangeText={setQuery}
          style={{ marginBottom: theme.custom.spacing.md }}
        />

        {items.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={{ marginBottom: theme.custom.spacing.sm }}
          >
            <FilterChip
              label="All"
              count={searched.length}
              selected={categoryFilter === null}
              onPress={() => setCategoryFilter(null)}
            />
            {chips.map((chip) => (
              <FilterChip
                key={chip.value}
                label={chip.label}
                count={chip.count}
                selected={categoryFilter === chip.value}
                onPress={() => setCategoryFilter(categoryFilter === chip.value ? null : chip.value)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {!loaded ? (
        <View style={{ paddingHorizontal: theme.custom.spacing.lg }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          // A real list, so every skill is reachable. The previous version laid
          // its rows out inside a fixed-height View and nothing scrolled.
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
          renderItem={({ item }) => (
            <SkillCard skill={item} onPress={() => router.push(ROUTES.skillForm(item.id))} onLongPress={() => confirmRemove(item)} />
          )}
          ListEmptyComponent={
            isFiltered ? (
              <EmptyState
                icon="magnify"
                title="No matching skills"
                description="Nothing here matches your search and filter."
                actionLabel="Clear filters"
                onAction={() => {
                  setQuery('');
                  setCategoryFilter(null);
                }}
              />
            ) : (
              <EmptyState
                icon="star-outline"
                title="No skills yet"
                description="Add the languages, frameworks, and tools you're proficient with."
                actionLabel="Add your first skill"
                onAction={() => router.push(ROUTES.skillForm())}
              />
            )
          }
        />
      )}

      <FAB
        icon="plus"
        accessibilityLabel="Add skill"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push(ROUTES.skillForm())}
      />
    </Screen>
  );
}

/**
 * One skill, built on the same card as a project: a square leading tile, the
 * name, a line of supporting detail, and a status badge underneath.
 */
const SkillCard: React.FC<{ skill: Skill; onPress: () => void; onLongPress: () => void }> = ({
  skill,
  onPress,
  onLongPress,
}) => {
  const theme = useAppTheme();

  const meta = [
    CATEGORY_LABEL.get(skill.category),
    skill.yearsOfExperience
      ? `${skill.yearsOfExperience} yr${skill.yearsOfExperience === 1 ? '' : 's'} experience`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppCard onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.row}>
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: theme.custom.radius.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={CATEGORY_ICON[skill.category]}
            size={26}
            color={theme.colors.onPrimaryContainer}
          />
        </View>

        <View style={{ flex: 1, marginLeft: theme.custom.spacing.md }}>
          <View style={styles.titleRow}>
            <Text variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
              {skill.name}
            </Text>
            {skill.featured ? (
              <MaterialCommunityIcons
                name="star"
                size={16}
                color={theme.custom.brand.warning}
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </View>

          <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
            {meta}
          </Text>

          <View style={styles.badgeRow}>
            <Badge label={LEVEL_LABEL[skill.level]} tone={LEVEL_TONE[skill.level]} small />
          </View>
        </View>
      </View>
    </AppCard>
  );
};

/** Pill filter carrying its own count, so the list size is visible up front. */
const FilterChip: React.FC<{
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}> = ({ label, count, selected, onPress }) => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count} skills`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
          borderRadius: theme.custom.radius.pill,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        variant="labelMedium"
        style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>
      <Text
        variant="labelSmall"
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
          opacity: 0.75,
          marginLeft: 5,
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 },

  list: { flex: 1 },
  // Lets the empty state centre itself in the remaining space.
  emptyContent: { flexGrow: 1, justifyContent: 'center' },

  row: { flexDirection: 'row' },
  thumb: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 24 },
});
