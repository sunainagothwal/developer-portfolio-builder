import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, ProgressBar } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { SectionHeader } from '@components/common/SectionHeader';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProfileStore } from '@store/profileStore';
import { useProjectsStore } from '@store/projectsStore';
import { useSkillsStore } from '@store/skillsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useChecklistStore } from '@store/checklistStore';
import { ROUTES } from '@constants/routes';
import { relativeTime } from '@utils/date';

const QUICK_ACTIONS: Array<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; route: string }> = [
  { icon: 'folder-plus-outline', label: 'New Project', route: ROUTES.projectForm() },
  { icon: 'star-plus-outline', label: 'Add Skill', route: ROUTES.skillForm() },
  { icon: 'file-document-edit-outline', label: 'Build Resume', route: ROUTES.resume },
  { icon: 'web', label: 'Export Site', route: ROUTES.portfolioExport },
];

export default function DashboardScreen() {
  const theme = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { profile, load: loadProfile } = useProfileStore();
  const { items: projects, loaded: projectsLoaded, load: loadProjects } = useProjectsStore();
  const { items: skills, loaded: skillsLoaded, load: loadSkills } = useSkillsStore();
  const { items: experience, loaded: experienceLoaded, load: loadExperience } = useExperienceStore();
  const { items: checklist, loaded: checklistLoaded, load: loadChecklist } = useChecklistStore();

  const loadAll = async () => {
    await Promise.all([loadProfile(), loadProjects(), loadSkills(), loadExperience(), loadChecklist()]);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const checklistProgress = useMemo(() => {
    if (!checklist.length) return 0;
    return checklist.filter((c) => c.done).length / checklist.length;
  }, [checklist]);

  const recentItems = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
  }, [projects]);

  const isLoading = !projectsLoaded || !skillsLoaded || !experienceLoaded || !checklistLoaded;
  const firstName = profile?.fullName?.split(' ')[0] || 'there';

  const stats = [
    { label: 'Projects', value: projects.length, icon: 'folder-outline' as const, route: ROUTES.projects },
    { label: 'Skills', value: skills.length, icon: 'star-outline' as const, route: ROUTES.skills },
    { label: 'Roles', value: experience.length, icon: 'briefcase-outline' as const, route: ROUTES.experience },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} edges={['top']}>
      <View style={[styles.header, { marginTop: theme.custom.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Welcome back,
          </Text>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
            {firstName} 👋
          </Text>
        </View>
        <Avatar.Text
          size={48}
          label={(profile?.fullName || 'D P').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          onTouchEnd={() => router.push(ROUTES.profile)}
        />
      </View>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : (
        <>
          <View style={[styles.statsRow, { marginTop: theme.custom.spacing.lg }]}>
            {stats.map((s) => (
              <AppCard key={s.label} onPress={() => router.push(s.route)} style={styles.statCard}>
                <MaterialCommunityIcons name={s.icon} size={22} color={theme.colors.primary} />
                <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 6 }}>
                  {s.value}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {s.label}
                </Text>
              </AppCard>
            ))}
          </View>

          <SectionHeader
            title="Portfolio readiness"
            actionIcon="chevron-right"
            onActionPress={() => router.push(ROUTES.checklist)}
          />
          <AppCard onPress={() => router.push(ROUTES.checklist)}>
            <View style={styles.checklistRow}>
              <Text variant="titleMedium">{Math.round(checklistProgress * 100)}% complete</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {checklist.filter((c) => c.done).length}/{checklist.length} tasks
              </Text>
            </View>
            <ProgressBar
              progress={checklistProgress}
              color={theme.colors.primary}
              style={{ height: 8, borderRadius: 4, marginTop: 10 }}
            />
          </AppCard>

          <SectionHeader title="Quick actions" />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <AppCard key={action.label} onPress={() => router.push(action.route)} style={styles.quickCard}>
                <MaterialCommunityIcons name={action.icon} size={24} color={theme.colors.secondary} />
                <Text variant="labelLarge" style={{ marginTop: 8, textAlign: 'center' }}>
                  {action.label}
                </Text>
              </AppCard>
            ))}
          </View>

          <SectionHeader
            title="Recently updated"
            actionIcon="chevron-right"
            onActionPress={() => router.push(ROUTES.projects)}
          />
          {recentItems.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No projects yet — add your first one from Quick Actions above.
            </Text>
          ) : (
            recentItems.map((p) => (
              <AppCard key={p.id} onPress={() => router.push(ROUTES.projectDetail(p.id))}>
                <Text variant="titleMedium">{p.title || 'Untitled project'}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Updated {relativeTime(p.updatedAt)}
                </Text>
              </AppCard>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'flex-start', marginBottom: 0 },
  checklistRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  quickCard: { width: '47%', alignItems: 'center' },
});
