import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProfileStore } from '@store/profileStore';
import { useSkillsStore } from '@store/skillsStore';
import { useExperienceStore } from '@store/experienceStore';
import { useEducationStore } from '@store/educationStore';
import { useProjectsStore } from '@store/projectsStore';
import { useCertificatesStore } from '@store/certificatesStore';
import { buildResumeHtml } from '@lib/pdf/resumeTemplate';
import { generatePdfFromHtml, sharePdf } from '@lib/pdf/generateResumePdf';

const ACCENT_OPTIONS = ['#5B4CF0', '#0969DA', '#1A7F37', '#C4308F', '#0E8C6E', '#9A6700'];

export default function ResumeBuilderScreen() {
  const theme = useAppTheme();
  const { profile, load: loadProfile } = useProfileStore();
  const { items: skills, load: loadSkills } = useSkillsStore();
  const { items: experience, load: loadExperience } = useExperienceStore();
  const { items: education, load: loadEducation } = useEducationStore();
  const { items: projects, load: loadProjects } = useProjectsStore();
  const { items: certificates, load: loadCertificates } = useCertificatesStore();
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSkills();
    loadExperience();
    loadEducation();
    loadProjects();
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const html = useMemo(
    () => buildResumeHtml({ profile, skills, experience, education, projects, certificates }, accent),
    [profile, skills, experience, education, projects, certificates, accent]
  );

  const onExport = async () => {
    setGenerating(true);
    try {
      const uri = await generatePdfFromHtml(html);
      await sharePdf(uri);
    } finally {
      setGenerating(false);
    }
  };

  const isEmpty = !profile?.fullName && experience.length === 0 && education.length === 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Resume Builder' }} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.lg }}>
        Your resume is generated automatically from your Profile, Experience, Education, Skills, Projects, and
        Certificates. Update those sections and this stays in sync.
      </Text>

      {isEmpty ? (
        <AppCard>
          <Text variant="titleMedium">Add your career data first</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Fill in your Profile and at least one Experience or Education entry to generate a resume.
          </Text>
        </AppCard>
      ) : (
        <>
          <AppCard>
            <Text variant="titleSmall" style={{ marginBottom: 10 }}>
              Accent color
            </Text>
            <View style={styles.swatchRow}>
              {ACCENT_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setAccent(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, borderColor: accent === color ? theme.colors.onSurface : 'transparent' },
                  ]}
                />
              ))}
            </View>
          </AppCard>

          <AppCard>
            <Text variant="titleMedium">{profile?.fullName || 'Your Name'}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {profile?.headline}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
              {experience.length} experience entries · {education.length} education entries · {skills.length} skills ·{' '}
              {projects.length} projects
            </Text>
          </AppCard>

          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={onExport}
            disabled={generating}
            style={{ marginTop: theme.custom.spacing.md }}
          >
            {generating ? 'Generating PDF…' : 'Export & Share as PDF'}
          </Button>
          {generating ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
});
