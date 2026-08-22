import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, PaperProvider, MD3Theme } from 'react-native-paper';
import { PALETTES, AppColorScheme } from './palettes';
import { spacing, radius, typography, animation, iconSizes } from './tokens';
import { useSettingsStore } from '@store/settingsStore';

export interface AppTheme extends MD3Theme {
  custom: {
    spacing: typeof spacing;
    radius: typeof radius;
    typography: typeof typography;
    animation: typeof animation;
    iconSizes: typeof iconSizes;
    brand: AppColorScheme['brand'];
    isDark: boolean;
  };
}

function buildTheme(scheme: AppColorScheme, isDark: boolean): AppTheme {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: scheme.primary,
      onPrimary: scheme.onPrimary,
      primaryContainer: scheme.primaryContainer,
      onPrimaryContainer: scheme.onPrimaryContainer,
      secondary: scheme.secondary,
      onSecondary: scheme.onSecondary,
      secondaryContainer: scheme.secondaryContainer,
      onSecondaryContainer: scheme.onSecondaryContainer,
      tertiary: scheme.tertiary,
      onTertiary: scheme.onTertiary,
      background: scheme.background,
      onBackground: scheme.onBackground,
      surface: scheme.surface,
      onSurface: scheme.onSurface,
      surfaceVariant: scheme.surfaceVariant,
      onSurfaceVariant: scheme.onSurfaceVariant,
      outline: scheme.outline,
      error: scheme.error,
      onError: scheme.onError,
      elevation: scheme.elevation,
    },
    custom: {
      spacing,
      radius,
      typography,
      animation,
      iconSizes,
      brand: scheme.brand,
      isDark,
    },
  };
}

const ThemeExtrasContext = createContext<AppTheme | null>(null);

export const useAppTheme = (): AppTheme => {
  const ctx = useContext(ThemeExtrasContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
};

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const { themeMode } = useSettingsStore((s) => s.settings);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const theme = useMemo(() => {
    // Theme presets were removed; the app ships one palette in light and dark.
    const scheme = isDark ? PALETTES.default.dark : PALETTES.default.light;
    return buildTheme(scheme, isDark);
  }, [isDark]);

  return (
    <ThemeExtrasContext.Provider value={theme}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeExtrasContext.Provider>
  );
};
