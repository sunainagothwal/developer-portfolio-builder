/**
 * Design tokens shared by every theme preset.
 * Keeping these separate from color palettes lets us change the
 * visual "skin" (colors) independently from the visual "rhythm"
 * (spacing/typography/radius).
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  displayLarge: { fontSize: 34, lineHeight: 42, fontWeight: '700' as const },
  headlineLarge: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  headlineMedium: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  titleLarge: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  titleMedium: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  titleSmall: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  labelSmall: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
  mono: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const, fontFamily: 'monospace' },
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
