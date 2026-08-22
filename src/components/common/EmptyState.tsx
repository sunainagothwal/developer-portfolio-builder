import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@theme/ThemeProvider';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Consistent empty-state pattern for every list screen in the app
 * (Skills, Projects, Notes, Certificates, ...). Keeps first-run UX friendly.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'shape-outline',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { paddingVertical: theme.custom.spacing.huge }]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: theme.custom.radius.xl,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={40} color={theme.colors.onPrimaryContainer} />
      </View>
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginTop: theme.custom.spacing.lg, textAlign: 'center' }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: theme.custom.spacing.xs,
            textAlign: 'center',
            paddingHorizontal: theme.custom.spacing.xl,
          }}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} style={{ marginTop: theme.custom.spacing.lg }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // flexGrow lets the empty state centre itself in whatever space is left
  // instead of hugging the top of the list area.
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
});
