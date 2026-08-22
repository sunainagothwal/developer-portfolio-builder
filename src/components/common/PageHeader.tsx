import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@theme/ThemeProvider';

interface PageHeaderProps {
  title: string;
  /** Defaults to going back in the stack. */
  onBack?: () => void;
}

/**
 * In-page title with a back control, for screens that draw their own header
 * rather than using the navigator's.
 *
 * The title is centred against the full width and the back button sits on top
 * of it, so the title stays centred whether or not the button is there — which
 * a plain row would not do.
 *
 * Using the navigator's header here instead would add the status-bar inset a
 * second time underneath it (Screen already applies the top safe-area edge),
 * leaving a tall empty band between the header and the search field.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack }) => {
  const theme = useAppTheme();
  const canGoBack = onBack !== undefined || router.canGoBack();

  return (
    <View style={[styles.row, { marginBottom: theme.custom.spacing.md }]}>
      {canGoBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.back,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.custom.radius.pill,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
      ) : null}

      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { minHeight: 36, justifyContent: 'center' },
  back: { position: 'absolute', left: 0, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  title: { fontWeight: '700', textAlign: 'center' },
});
