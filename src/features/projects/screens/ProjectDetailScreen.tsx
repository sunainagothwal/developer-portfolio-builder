import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Linking } from 'react-native';
import { Text, IconButton, Menu, Divider } from 'react-native-paper';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Screen } from '@components/layouts/Screen';
import { Badge } from '@components/common/Badge';
import { useAppTheme } from '@theme/ThemeProvider';
import { useProjectsStore } from '@store/projectsStore';
import { useSkillsStore } from '@store/skillsStore';
import { ROUTES } from '@constants/routes';
import { formatDate } from '@utils/date';
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_TONE } from '@lib/validators/projectSchema';
import { useState } from 'react';

export default function ProjectDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, remove, load, loaded } = useProjectsStore();
  const { items: skills, load: loadSkills } = useSkillsStore();
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!loaded) load();
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const project = getById(id);

  if (!project) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Project' }} />
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 40, textAlign: 'center' }}>
          Project not found.
        </Text>
      </Screen>
    );
  }

  const linkedSkills = skills.filter((s) => project.skillIds.includes(s.id));

  const onDelete = async () => {
    await remove(project.id);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: project.title,
          headerRight: () => (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
            >
              <Menu.Item
                leadingIcon="pencil-outline"
                title="Edit"
                onPress={() => {
                  setMenuVisible(false);
                  router.push(ROUTES.projectForm(project.id));
                }}
              />
              <Menu.Item
                leadingIcon="delete-outline"
                title="Delete"
                onPress={() => {
                  setMenuVisible(false);
                  onDelete();
                }}
              />
            </Menu>
          ),
        }}
      />

      {project.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {project.images.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[styles.image, { borderRadius: theme.custom.radius.lg, marginRight: 10 }]}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.headerRow}>
        <Badge
          label={PROJECT_STATUS_OPTIONS.find((o) => o.value === project.status)?.label ?? project.status}
          tone={PROJECT_STATUS_TONE[project.status]}
        />
        {project.featured ? <Badge label="Featured ⭐" tone="warning" style={{ marginLeft: 8 }} /> : null}
      </View>

      {project.summary ? (
        <Text variant="bodyLarge" style={{ marginTop: 12, color: theme.colors.onSurface }}>
          {project.summary}
        </Text>
      ) : null}

      {(project.startDate || project.endDate) && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
          {formatDate(project.startDate)} — {formatDate(project.endDate)}
        </Text>
      )}

      {project.description ? (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text variant="titleSmall" style={{ marginBottom: 6 }}>
            About
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            {project.description}
          </Text>
        </>
      ) : null}

      {project.techStack.length > 0 ? (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text variant="titleSmall" style={{ marginBottom: 8 }}>
            Tech Stack
          </Text>
          <View style={styles.tagsWrap}>
            {project.techStack.map((t) => (
              <Badge key={t} label={t} tone="neutral" style={{ marginRight: 6, marginBottom: 6 }} />
            ))}
          </View>
        </>
      ) : null}

      {linkedSkills.length > 0 ? (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text variant="titleSmall" style={{ marginBottom: 8 }}>
            Related Skills
          </Text>
          <View style={styles.tagsWrap}>
            {linkedSkills.map((s) => (
              <Badge key={s.id} label={s.name} tone="primary" style={{ marginRight: 6, marginBottom: 6 }} />
            ))}
          </View>
        </>
      ) : null}

      {project.links.length > 0 ? (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text variant="titleSmall" style={{ marginBottom: 8 }}>
            Links
          </Text>
          {project.links.map((link) => (
            <View key={link.url} style={styles.linkRow}>
              <IconButton icon="link-variant" size={18} onPress={() => Linking.openURL(link.url)} style={{ margin: 0 }} />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.primary }}
                onPress={() => Linking.openURL(link.url)}
              >
                {link.label}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', marginTop: 16 },
  // Scales with the viewport instead of a fixed 240px, which overflowed on
  // narrow devices. aspectRatio keeps the 16:10 proportion on every screen.
  image: { width: '100%', maxWidth: 320, aspectRatio: 16 / 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
});
