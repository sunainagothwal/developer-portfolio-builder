import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Chip, Switch, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@components/layouts/Screen';
import { AppCard } from '@components/common/AppCard';
import { Badge } from '@components/common/Badge';
import { SectionHeader } from '@components/common/SectionHeader';
import { Skeleton } from '@components/common/Skeleton';
import { EmptyState } from '@components/common/EmptyState';
import { useAppTheme } from '@theme/ThemeProvider';

interface GallerySection {
  title: string;
  description: string;
  snippet: string;
  render: () => React.ReactNode;
}

export default function ComponentGalleryScreen() {
  const theme = useAppTheme();
  const [switchOn, setSwitchOn] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copySnippet = async (snippet: string, index: number) => {
    await Clipboard.setStringAsync(snippet);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const sections: GallerySection[] = [
    {
      title: 'Badges',
      description: 'Status/category pills used across projects, skills, and interviews.',
      snippet: `<Badge label="In Progress" tone="info" />`,
      render: () => (
        <View style={styles.wrapRow}>
          <Badge label="Primary" tone="primary" style={{ marginRight: 8 }} />
          <Badge label="Success" tone="success" style={{ marginRight: 8 }} />
          <Badge label="Warning" tone="warning" style={{ marginRight: 8 }} />
          <Badge label="Danger" tone="danger" style={{ marginRight: 8 }} />
          <Badge label="Info" tone="info" style={{ marginRight: 8 }} />
          <Badge label="Neutral" tone="neutral" />
        </View>
      ),
    },
    {
      title: 'Buttons',
      description: 'Material Design 3 button variants from react-native-paper.',
      snippet: `<Button mode="contained">Primary action</Button>`,
      render: () => (
        <View style={styles.wrapRow}>
          <Button mode="contained" style={styles.buttonSpacing}>
            Contained
          </Button>
          <Button mode="outlined" style={styles.buttonSpacing}>
            Outlined
          </Button>
          <Button mode="text" style={styles.buttonSpacing}>
            Text
          </Button>
        </View>
      ),
    },
    {
      title: 'Cards',
      description: 'The base AppCard component with press micro-interaction.',
      snippet: `<AppCard onPress={() => {}}>...</AppCard>`,
      render: () => (
        <AppCard onPress={() => undefined}>
          <Text variant="titleMedium">Tappable card</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Press me — I scale down slightly for tactile feedback.
          </Text>
        </AppCard>
      ),
    },
    {
      title: 'Chips',
      description: 'Selectable filter chips, used for categories and tags.',
      snippet: `<Chip selected={true}>TypeScript</Chip>`,
      render: () => (
        <View style={styles.wrapRow}>
          <Chip selected style={{ marginRight: 8 }}>
            Selected
          </Chip>
          <Chip style={{ marginRight: 8 }}>Unselected</Chip>
          <Chip icon="check" style={{ marginRight: 8 }}>
            With icon
          </Chip>
        </View>
      ),
    },
    {
      title: 'Progress indicators',
      description: 'Linear progress bars and activity spinners.',
      snippet: `<ProgressBar progress={0.6} color={theme.colors.primary} />`,
      render: () => (
        <View>
          <ProgressBar progress={0.6} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginBottom: 12 }} />
          <ActivityIndicator />
        </View>
      ),
    },
    {
      title: 'Skeleton loaders',
      description: 'Shimmering placeholders shown while data loads.',
      snippet: `<Skeleton width="60%" height={18} />`,
      render: () => (
        <View>
          <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
          <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      ),
    },
    {
      title: 'Switches',
      description: 'Toggle controls used throughout forms and settings.',
      snippet: `<Switch value={value} onValueChange={setValue} />`,
      render: () => <Switch value={switchOn} onValueChange={setSwitchOn} />,
    },
    {
      title: 'Empty states',
      description: 'Consistent first-run / zero-data pattern for every list screen.',
      snippet: `<EmptyState icon="star-outline" title="No skills yet" actionLabel="Add" onAction={fn} />`,
      render: () => (
        <EmptyState icon="star-outline" title="No items yet" description="This is what an empty list looks like." />
      ),
    },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Component Gallery' }} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: theme.custom.spacing.lg }}>
        A living reference of the reusable UI patterns used throughout this app — handy when building your own
        screens or explaining your design system in an interview.
      </Text>

      {sections.map((section, index) => (
        <View key={section.title} style={{ marginBottom: theme.custom.spacing.xl }}>
          <SectionHeader
            title={section.title}
            subtitle={section.description}
            actionIcon={copiedIndex === index ? 'check' : 'content-copy'}
            onActionPress={() => copySnippet(section.snippet, index)}
            actionLabel="Copy snippet"
          />
          <AppCard>{section.render()}</AppCard>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  buttonSpacing: { marginRight: 8, marginBottom: 8 },
});
