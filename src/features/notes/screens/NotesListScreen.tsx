import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Searchbar, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useNotesStore } from '@store/notesStore';
import { ROUTES } from '@constants/routes';
import { relativeTime } from '@utils/date';

export default function NotesListScreen() {
  const theme = useAppTheme();
  const { items, loaded, load } = useNotesStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [items, query]);

  const stripMarkdown = (md: string) => md.replace(/[#*_`>\-]/g, '').slice(0, 120);

  return (
    <Screen scroll={false} padded={false} edges={['top']}>
      <View style={{ paddingHorizontal: theme.custom.spacing.lg, paddingTop: theme.custom.spacing.md }}>
        <Text
          variant="headlineMedium"
          style={{ fontWeight: '700', marginBottom: theme.custom.spacing.md, textAlign: 'center' }}
        >
          Notes
        </Text>
        <Searchbar placeholder="Search notes" value={query} onChangeText={setQuery} style={{ marginBottom: theme.custom.spacing.md }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: theme.custom.spacing.lg }}>
        {!loaded ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="notebook-outline"
            title="No notes yet"
            description="Jot down ideas, snippets, or reminders — markdown supported."
            actionLabel="Create your first note"
            onAction={() => router.push(ROUTES.noteEditor())}
          />
        ) : (
          filtered.map((note) => (
            <AppCard
              key={note.id}
              onPress={() => router.push(ROUTES.noteEditor(note.id))}
            >
              <View style={styles.row}>
                <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={1}>
                  {note.pinned ? '📌 ' : ''}
                  {note.title || 'Untitled note'}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
                {stripMarkdown(note.content)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, opacity: 0.7 }}>
                {relativeTime(note.updatedAt)}
              </Text>
            </AppCard>
          ))
        )}
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push(ROUTES.noteEditor())}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24 },
});
