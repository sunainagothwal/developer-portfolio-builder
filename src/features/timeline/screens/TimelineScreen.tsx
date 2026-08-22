import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@components/layouts/Screen';
import { EmptyState } from '@components/common/EmptyState';
import { SkeletonList } from '@components/common/Skeleton';
import { useAppTheme } from '@theme/ThemeProvider';
import { useExperienceStore } from '@store/experienceStore';
import { useEducationStore } from '@store/educationStore';
import { useCertificatesStore } from '@store/certificatesStore';
import { useAchievementsStore } from '@store/achievementsStore';
import { useProjectsStore } from '@store/projectsStore';
import { formatDate } from '@utils/date';
import type { TimelineEvent, TimelineEventType } from '@models/models';

const TYPE_ICON: Record<TimelineEventType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  job: 'briefcase-outline',
  education: 'school-outline',
  certificate: 'certificate-outline',
  achievement: 'trophy-outline',
  project: 'folder-outline',
};

const TYPE_COLOR_KEY: Record<TimelineEventType, string> = {
  job: 'primary',
  education: 'secondary',
  certificate: 'tertiary',
  achievement: 'warning',
  project: 'info',
};

export default function TimelineScreen() {
  const theme = useAppTheme();
  const { items: experiences, loaded: expLoaded, load: loadExp } = useExperienceStore();
  const { items: education, loaded: eduLoaded, load: loadEdu } = useEducationStore();
  const { items: certificates, loaded: certLoaded, load: loadCert } = useCertificatesStore();
  const { items: achievements, loaded: achLoaded, load: loadAch } = useAchievementsStore();
  const { items: projects, loaded: projLoaded, load: loadProj } = useProjectsStore();

  useEffect(() => {
    loadExp();
    loadEdu();
    loadCert();
    loadAch();
    loadProj();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loaded = expLoaded && eduLoaded && certLoaded && achLoaded && projLoaded;

  const events: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [];
    experiences.forEach((e) =>
      list.push({ id: e.id, type: 'job', title: e.role, subtitle: e.company, date: e.startDate, endDate: e.endDate, sourceId: e.id })
    );
    education.forEach((e) =>
      list.push({ id: e.id, type: 'education', title: e.degree, subtitle: e.institution, date: e.startDate, endDate: e.endDate, sourceId: e.id })
    );
    certificates.forEach((c) =>
      list.push({ id: c.id, type: 'certificate', title: c.name, subtitle: c.issuingOrg, date: c.issueDate, sourceId: c.id })
    );
    achievements.forEach((a) =>
      list.push({ id: a.id, type: 'achievement', title: a.title, date: a.date, sourceId: a.id })
    );
    projects
      .filter((p) => p.startDate)
      .forEach((p) =>
        list.push({ id: p.id, type: 'project', title: p.title, subtitle: p.summary, date: p.startDate as string, sourceId: p.id })
      );
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [experiences, education, certificates, achievements, projects]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Career Timeline' }} />
      {!loaded ? (
        <SkeletonList count={5} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="timeline-clock-outline"
          title="Your timeline is empty"
          description="Add experience, education, certificates, achievements, or projects to see your journey visualized here."
        />
      ) : (
        <View style={{ marginTop: 8 }}>
          {events.map((event, index) => {
            const colorKey = TYPE_COLOR_KEY[event.type];
            const dotColor =
              colorKey === 'warning' || colorKey === 'info'
                ? theme.custom.brand[colorKey as 'warning' | 'info']
                : (theme.colors as unknown as Record<string, string>)[colorKey];
            return (
              <View key={`${event.type}-${event.id}`} style={styles.eventRow}>
                <View style={styles.timelineCol}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]}>
                    <MaterialCommunityIcons name={TYPE_ICON[event.type]} size={14} color="#fff" />
                  </View>
                  {index < events.length - 1 ? (
                    <View style={[styles.line, { backgroundColor: theme.colors.surfaceVariant }]} />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 24 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDate(event.date)}
                    {event.endDate !== undefined ? ` — ${formatDate(event.endDate)}` : ''}
                  </Text>
                  <Text variant="titleMedium" style={{ marginTop: 2 }}>
                    {event.title}
                  </Text>
                  {event.subtitle ? (
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {event.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventRow: { flexDirection: 'row' },
  timelineCol: { alignItems: 'center', width: 32, marginRight: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginTop: 4 },
});
