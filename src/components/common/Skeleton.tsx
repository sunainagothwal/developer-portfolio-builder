import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@theme/ThemeProvider';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

/** Single shimmering placeholder block. */
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, style, borderRadius }) => {
  const theme = useAppTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: borderRadius ?? theme.custom.radius.sm,
        },
        style,
      ]}
    />
  );
};

/** Prebuilt skeleton for a list-of-cards loading state (Dashboard, Skills, Projects, ...). */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  const theme = useAppTheme();
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.custom.radius.lg,
              marginBottom: theme.custom.spacing.md,
              padding: theme.custom.spacing.lg,
            },
          ]}
        >
          <Skeleton width="60%" height={18} style={{ marginBottom: 10 }} />
          <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.15)' },
});
