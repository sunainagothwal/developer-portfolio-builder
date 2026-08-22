import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@store/settingsStore';

interface Slide {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'briefcase-variant',
    title: 'Your whole career, in one app',
    description:
      'Profile, projects, skills, experience, certificates and more — organized in a single offline-first workspace.',
  },
  {
    icon: 'file-account',
    title: 'Build resumes & portfolios instantly',
    description:
      'Generate a polished PDF resume or a static portfolio website from the same data, anytime, with zero setup.',
  },
  {
    icon: 'shield-lock-outline',
    title: '100% private, 100% offline',
    description:
      'No account, no cloud, no ads. Everything lives on your device. Back up to a JSON file whenever you like.',
  },
];

const DASHBOARD = '/(tabs)/dashboard' as const;

/** Minimum comfortable touch target (Material/HIG guidance). */
const MIN_TOUCH = 48;

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  // Scale the artwork to the viewport instead of hard-coding pixels, so it
  // stays proportional from small phones through to tablets.
  const iconBox = Math.max(84, Math.min(width * 0.3, height * 0.16, 140));
  const iconGlyph = Math.round(iconBox * 0.46);

  // Navigate first so the transition never depends on AsyncStorage resolving;
  // persisting the flag afterwards is best-effort.
  const finish = (source: string) => {
    console.log(`[onboarding] finish() called from "${source}" — navigating to dashboard`);
    router.replace(DASHBOARD);
    completeOnboarding()
      .then(() => console.log('[onboarding] onboardingComplete flag saved'))
      .catch((error) => console.error('[onboarding] failed to save flag:', error));
  };

  const next = () => {
    console.log('[onboarding] Next pressed at index', index);
    if (index < SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      finish('Get Started');
    }
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          // Respect the home indicator / nav bar without stacking an extra
          // fixed inset on top of it, which is what pushed the footer out of
          // bounds and made the buttons only partially tappable.
          paddingBottom: insets.bottom + 16,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* Scrolls only if the viewport is too short for the content, so nothing
          can ever overflow the container on small screens. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[
            styles.iconWrap,
            {
              width: iconBox,
              height: iconBox,
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: theme.custom.radius.xl,
            },
          ]}
        >
          <MaterialCommunityIcons name={slide.icon} size={iconGlyph} color={theme.colors.onPrimaryContainer} />
        </View>

        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.onBackground }]}
        >
          {slide.title}
        </Text>

        <Text
          variant="bodyLarge"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {slide.description}
        </Text>
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View
            key={s.title}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? theme.colors.primary : theme.colors.surfaceVariant,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer} onTouchStart={() => console.log('[onboarding] FOOTER touch detected')}>
        <Pressable
          onPress={() => finish('Skip')}
          hitSlop={12}
          style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Skip
          </Text>
        </Pressable>

        <Pressable
          onPress={next}
          hitSlop={12}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: theme.colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '8%',
    paddingVertical: 24,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', marginTop: 32, fontWeight: '700' },
  description: { textAlign: 'center', marginTop: 12 },
  dotsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  skipButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: MIN_TOUCH / 2,
  },
  nextButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    borderRadius: MIN_TOUCH / 2,
  },
});
