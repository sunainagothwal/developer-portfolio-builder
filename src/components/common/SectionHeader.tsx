import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionIcon?: string;
  onActionPress?: () => void;
  actionLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionIcon,
  onActionPress,
  actionLabel,
}) => {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { marginBottom: theme.custom.spacing.sm }]}>
      <View style={{ flex: 1 }}>
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionIcon && onActionPress ? (
        <IconButton
          icon={actionIcon}
          mode="contained-tonal"
          size={20}
          onPress={onActionPress}
          accessibilityLabel={actionLabel ?? title}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
