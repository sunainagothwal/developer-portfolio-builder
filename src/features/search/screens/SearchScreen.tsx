import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { EmptyState } from '@components/common/EmptyState';
import { useAppTheme } from '@theme/ThemeProvider';
import { useGlobalSearchIndex } from '../useGlobalSearchIndex';
import { useSkillsStore } from '@store/skillsStore';
import { useProjectsStore } from '@store/projectsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useEducationStore } from '@store/educationStore';
import { useCertificatesStore } from '@store/certificatesStore';
import { useAchievementsStore } from '@store/achievementsStore';
import { useNotesStore } from '@store/notesStore';
import { useLearningStore } from '@store/learningStore';
import { useInterviewStore } from '@store/interviewStore';

const TYPE_LABELS: Record<string, string> = {
  skill: 'Skill',
  project: 'Project',
  experience: 'Experience',
  education: 'Education',
  certificate: 'Certificate',
  achievement: 'Achievement',
  note: 'Note',
  learning: 'Learning',
  interview: 'Interview',
};

export default function SearchScreen() {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const { results } = useGlobalSearchIndex(query);

  // Ensure every store is loaded so search has full coverage the first time it's opened.
  const stores = [
    useSkillsStore(),
    useProjectsStore(),
    useExperienceStore(),
    useEducationStore(),
    useCertificatesStore(),
    useAchievementsStore(),
    useNotesStore(),
    useLearningStore(),
    useInterviewStore(),
  ];
  useEffect(() => {
    stores.forEach((s) => {
      if (!s.loaded) s.load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Search' }} />
      <Searchbar
        placeholder="Search everything..."
        value={query}
        onChangeText={setQuery}
        autoFocus
        style={{ marginBottom: theme.custom.spacing.md, marginTop: theme.custom.spacing.sm }}
      />
      {query.trim() === '' ? (
        <EmptyState icon="magnify" title="Search your whole career" description="Projects, skills, notes, experience, and more — all in one place." />
      ) : results.length === 0 ? (
        <EmptyState icon="magnify-close" title="No results" description={`Nothing matched "${query}"`} />
      ) : (
        results.map((r) => (
          <AppCard key={`${r.type}-${r.id}`} onPress={() => router.push(r.route)}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium">{r.title || 'Untitled'}</Text>
                {r.subtitle ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {r.subtitle}
                  </Text>
                ) : null}
              </View>
              <Badge label={TYPE_LABELS[r.type] ?? r.type} tone="neutral" small />
            </View>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
