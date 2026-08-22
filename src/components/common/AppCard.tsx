import React from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@theme/ThemeProvider';

interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A pressable card with a subtle scale micro-interaction on press.
 * Foundation for ProjectCard, SkillChip container, NoteCard, etc.
 */
export const AppCard: React.FC<AppCardProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  elevated = true,
  testID,
}) => {
  const theme = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withTiming(0.97, { duration: 100 });
  };
  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        animatedStyle,
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.custom.radius.lg,
          borderColor: theme.colors.surfaceVariant,
          padding: theme.custom.spacing.lg,
          shadowOpacity: elevated ? (theme.custom.isDark ? 0.4 : 0.08) : 0,
        },
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
});
