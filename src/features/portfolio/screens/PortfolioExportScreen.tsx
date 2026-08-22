import React, { useEffect, useMemo, useState } from 'react';
import { Text, Button, ActivityIndicator, List } from 'react-native-paper';
import { Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProfileStore } from '@store/profileStore';
import { useSkillsStore } from '@store/skillsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useEducationStore } from '@store/educationStore';
import { useProjectsStore } from '@store/projectsStore';
import { useAchievementsStore } from '@store/achievementsStore';
import { buildPortfolioSiteHtml } from '@lib/export/portfolioSiteTemplate';
import { exportPortfolioSiteToFile, sharePortfolioSite } from '@lib/export/portfolioExportService';

export default function PortfolioExportScreen() {
  const theme = useAppTheme();
  const { profile, load: loadProfile } = useProfileStore();
  const { items: skills, load: loadSkills } = useSkillsStore();
  const { items: experience, load: loadExperience } = useExperienceStore();
  const { items: education, load: loadEducation } = useEducationStore();
  const { items: projects, load: loadProjects } = useProjectsStore();
  const { items: achievements, load: loadAchievements } = useAchievementsStore();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSkills();
    loadExperience();
    loadEducation();
    loadProjects();
    loadAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const html = useMemo(
    () => buildPortfolioSiteHtml({ profile, skills, experience, education, projects, achievements }),
    [profile, skills, experience, education, projects, achievements]
  );

  const featuredCount = projects.filter((p) => p.featured).length || projects.length;

  const onExport = async () => {
    setGenerating(true);
    try {
      const uri = await exportPortfolioSiteToFile(html);
      await sharePortfolioSite(uri);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Portfolio Website' }} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.lg }}>
        Generates a complete, dependency-free static website — a single HTML file with inline CSS and JS. No build
        step required. Host it anywhere: GitHub Pages, Netlify, Vercel, or any static file host.
      </Text>

      <AppCard>
        <List.Item
          title="Projects"
          description={`${featuredCount} will be included`}
          left={(props) => <List.Icon {...props} icon="folder-outline" />}
        />
        <List.Item
          title="Experience"
          description={`${experience.length} entries`}
          left={(props) => <List.Icon {...props} icon="briefcase-outline" />}
        />
        <List.Item
          title="Skills"
          description={`${skills.length} listed`}
          left={(props) => <List.Icon {...props} icon="star-outline" />}
        />
        <List.Item
          title="Education & Achievements"
          description={`${education.length} + ${achievements.length} entries`}
          left={(props) => <List.Icon {...props} icon="school-outline" />}
        />
      </AppCard>

      <Button
        mode="contained"
        icon="web"
        onPress={onExport}
        disabled={generating}
        style={{ marginTop: theme.custom.spacing.md }}
      >
        {generating ? 'Generating site…' : 'Export & Share HTML site'}
      </Button>
      {generating ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.custom.spacing.lg }}>
        Tip: after exporting, rename the file to{' '}
        <Text style={{ fontFamily: 'monospace' }}>index.html</Text> before uploading it to your host of choice.
      </Text>
    </Screen>
  );
}
