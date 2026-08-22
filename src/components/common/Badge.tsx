import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@theme/ThemeProvider';

interface BadgeProps {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  style?: ViewStyle;
  small?: boolean;
}

/** Small colored pill used for status/category labels (project status, skill level, etc.) */
export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', style, small }) => {
  const theme = useAppTheme();

  const toneColors: Record<string, { bg: string; fg: string }> = {
    primary: { bg: theme.colors.primaryContainer, fg: theme.colors.onPrimaryContainer },
    success: { bg: theme.custom.brand.success + '26', fg: theme.custom.brand.success },
    warning: { bg: theme.custom.brand.warning + '26', fg: theme.custom.brand.warning },
    danger: { bg: theme.custom.brand.danger + '26', fg: theme.custom.brand.danger },
    info: { bg: theme.custom.brand.info + '26', fg: theme.custom.brand.info },
    neutral: { bg: theme.colors.surfaceVariant, fg: theme.colors.onSurfaceVariant },
  };
  const colors = toneColors[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.bg,
          borderRadius: theme.custom.radius.pill,
          paddingVertical: small ? 2 : 4,
          paddingHorizontal: small ? 8 : 10,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.fg, fontSize: small ? 10 : 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start' },
});
