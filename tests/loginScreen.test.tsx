/**
 * The sign-in screen is the landing screen, so anything that throws during its
 * render locks the user out of the whole app.
 *
 * That is exactly what happened: `useIdTokenAuthRequest` throws
 * "Client Id property `iosClientId` must be defined to use Google auth on this
 * platform." during render when the running platform has no client ID, and it
 * was being called unconditionally. Testing an Android build on an iPhone hit
 * it immediately.
 */

import React, { act } from 'react';
import { Text as RNText } from 'react-native';

interface TestInstance {
  props: Record<string, unknown>;
  findAll: (predicate: (node: TestInstance) => boolean) => TestInstance[];
  findAllByType: (type: unknown) => TestInstance[];
}
interface TestRenderer {
  root: TestInstance;
}

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
}));

jest.mock('@store/settingsStore', () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({ settings: { themeMode: 'light' } }),
}));

jest.mock('@store/authStore', () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
  }),
}));

// expo-web-browser is a native module with no JS-only fallback under jest.
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

/**
 * Faithful to the real provider: it throws when the platform's id is missing.
 * A mock that returned a value instead would let the bug straight back in.
 */
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: ({ iosClientId }: { iosClientId?: string }) => {
    if (typeof iosClientId === 'undefined') {
      throw new Error(
        'Client Id property `iosClientId` must be defined to use Google auth on this platform.',
      );
    }
    return [{ url: 'https://accounts.google.com' }, null, jest.fn()];
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const renderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => TestRenderer;
};
const { AppThemeProvider } = require('@theme/ThemeProvider');
const LoginScreen = require('@features/auth/screens/LoginScreen').default;
/* eslint-enable @typescript-eslint/no-var-requires */

function renderScreen(): TestRenderer {
  let tree!: TestRenderer;
  act(() => {
    tree = renderer.create(
      <AppThemeProvider>
        <LoginScreen />
      </AppThemeProvider>,
    );
  });
  return tree;
}

function allText(tree: TestRenderer): string[] {
  return tree.root
    .findAllByType(RNText)
    .flatMap((node: TestInstance) =>
      React.Children.toArray(node.props.children as React.ReactNode).filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

describe('LoginScreen without any Google client ID', () => {
  const warn = console.warn;
  beforeAll(() => {
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('required icon libraries')) return;
      warn(...args);
    };
  });
  afterAll(() => {
    console.warn = warn;
  });

  it('renders instead of throwing', () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it('still offers email sign-in, which does not depend on Google', () => {
    const labels = allText(renderScreen());
    expect(labels).toContain('Sign in');
    expect(labels).toContain('Create an account');
  });

  it('shows the Google button as unavailable rather than hiding the failure', () => {
    const tree = renderScreen();
    expect(allText(tree)).toContain('Continue with Google');
    expect(allText(tree).join(' ')).toMatch(/client ID/i);
  });
});
