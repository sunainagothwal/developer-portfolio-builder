import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { SectionHeader } from '@components/common/SectionHeader';
import { useAppTheme } from '@theme/ThemeProvider';
import { ROUTES } from '@constants/routes';

interface ModuleItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  route: string;
}

const CAREER_MODULES: ModuleItem[] = [
  { icon: 'account-circle-outline', title: 'Profile', description: 'Your public identity', route: ROUTES.profile },
  { icon: 'star-outline', title: 'Skills', description: 'Languages, tools, frameworks', route: ROUTES.skills },
  { icon: 'folder-outline', title: 'Projects', description: 'Portfolio-worthy work', route: ROUTES.projects },
  { icon: 'briefcase-outline', title: 'Experience', description: 'Work history', route: ROUTES.experience },
  { icon: 'school-outline', title: 'Education', description: 'Degrees & courses', route: ROUTES.education },
  { icon: 'certificate-outline', title: 'Certificates', description: 'Credentials earned', route: ROUTES.certificates },
  { icon: 'trophy-outline', title: 'Achievements', description: 'Awards & recognitions', route: ROUTES.achievements },
];

const CAREER_TOOLS: ModuleItem[] = [
  { icon: 'file-account-outline', title: 'Resume Builder', description: 'Generate a PDF resume', route: ROUTES.resume },
  { icon: 'web', title: 'Portfolio Website', description: 'Export static HTML site', route: ROUTES.portfolioExport },
  { icon: 'timeline-clock-outline', title: 'Career Timeline', description: 'Your journey, visualized', route: ROUTES.timeline },
  { icon: 'checkbox-marked-circle-outline', title: 'Portfolio Checklist', description: 'Readiness tracker', route: ROUTES.checklist },
];

const GROWTH_MODULES: ModuleItem[] = [
  { icon: 'book-open-page-variant-outline', title: 'Learning Tracker', description: 'Courses, books, videos', route: ROUTES.learning },
  { icon: 'account-tie-voice-outline', title: 'Interview Tracker', description: 'Applications & pipeline', route: ROUTES.interviews },
  { icon: 'view-grid-outline', title: 'Component Gallery', description: 'UI reference snippets', route: ROUTES.componentGallery },
];

const SYSTEM_MODULES: ModuleItem[] = [
  { icon: 'magnify', title: 'Search', description: 'Find anything, instantly', route: ROUTES.search },
];

function ModuleGrid({ items }: { items: ModuleItem[] }) {
  const theme = useAppTheme();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <AppCard key={item.title} onPress={() => router.push(item.route)} style={styles.tile}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.custom.radius.md },
            ]}
          >
            <MaterialCommunityIcons name={item.icon} size={22} color={theme.colors.onPrimaryContainer} />
          </View>
          <Text variant="titleSmall" style={{ marginTop: 10, fontWeight: '700' }}>
            {item.title}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {item.description}
          </Text>
        </AppCard>
      ))}
    </View>
  );
}

export default function HubScreen() {
  return (
    <Screen edges={['top']}>
      <SectionHeader title="Manage" subtitle="Everything that makes up your career" />

      <Text variant="labelLarge" style={styles.groupLabel}>
        CAREER DATA
      </Text>
      <ModuleGrid items={CAREER_MODULES} />

      <Text variant="labelLarge" style={styles.groupLabel}>
        OUTPUT
      </Text>
      <ModuleGrid items={CAREER_TOOLS} />

      <Text variant="labelLarge" style={styles.groupLabel}>
        GROWTH
      </Text>
      <ModuleGrid items={GROWTH_MODULES} />

      <Text variant="labelLarge" style={styles.groupLabel}>
        SYSTEM
      </Text>
      <ModuleGrid items={SYSTEM_MODULES} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  tile: { width: '47%' },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { opacity: 0.5, marginTop: 20, marginBottom: 10, letterSpacing: 1 },
});
