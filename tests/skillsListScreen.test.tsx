/**
 * Render cover for the Skills list.
 *
 * The screen previously rendered its rows inside a fixed-height View, so every
 * skill past the first screenful was unreachable — invisible to a type check
 * and to every other test. These assertions pin the things that made it
 * broken: the list must be a real scrolling list, and it must hold every
 * record.
 */

import React, { act } from 'react';
import { FlatList, Text as RNText } from 'react-native';
import type { Skill } from '../src/types/models';

/**
 * Minimal shape of the bits of react-test-renderer used here. Declared locally
 * so the suite does not pull in an extra @types package for four members.
 */
interface TestInstance {
  props: Record<string, unknown>;
  findByType: (type: unknown) => TestInstance;
  findAllByType: (type: unknown) => TestInstance[];
  findAll: (predicate: (node: TestInstance) => boolean) => TestInstance[];
}
interface TestRenderer {
  root: TestInstance;
}

const makeSkill = (name: string, over: Partial<Skill> = {}): Skill => ({
  id: name.toLowerCase(),
  name,
  category: 'language',
  level: 'intermediate',
  featured: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...over,
});

/**
 * Deliberately more skills than fit on one screen. The name is prefixed
 * `mock` so jest's factory hoisting permits the reference.
 */
const mockSkills: Skill[] = [
  makeSkill('TypeScript', { level: 'expert', featured: true }),
  makeSkill('JavaScript', { level: 'advanced' }),
  makeSkill('Python', { level: 'beginner' }),
  makeSkill('Go'),
  makeSkill('React', { category: 'framework', level: 'advanced' }),
  makeSkill('Django', { category: 'framework' }),
  makeSkill('PostgreSQL', { category: 'database', level: 'advanced' }),
  makeSkill('Redis', { category: 'database' }),
  makeSkill('Docker', { category: 'devops', level: 'expert' }),
  makeSkill('Kubernetes', { category: 'devops' }),
  makeSkill('Figma', { category: 'design' }),
  makeSkill('Git', { category: 'tool', level: 'expert' }),
];

const mockRemove = jest.fn();

/** Options the screen hands to the navigator, captured for assertions. */
const mockStackOptions: Record<string, unknown>[] = [];

// @expo/vector-icons pulls in expo-font -> expo-asset, which is not installed
// in this project. The icons carry no behaviour worth asserting here.
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  Stack: {
    Screen: ({ options }: { options?: Record<string, unknown> }) => {
      if (options) mockStackOptions.push(options);
      return null;
    },
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock('@store/settingsStore', () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({ settings: { themeMode: 'light', themePreset: 'default' } }),
}));

jest.mock('@store/skillsStore', () => ({
  useSkillsStore: () => ({
    items: mockSkills,
    loaded: true,
    load: jest.fn(),
    remove: mockRemove,
  }),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const renderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => TestRenderer;
};
const { AppThemeProvider } = require('@theme/ThemeProvider');
const SkillsListScreen = require('@features/skills/screens/SkillsListScreen').default;
/* eslint-enable @typescript-eslint/no-var-requires */

function renderScreen(): TestRenderer {
  let tree!: TestRenderer;
  act(() => {
    tree = renderer.create(
      <AppThemeProvider>
        <SkillsListScreen />
      </AppThemeProvider>,
    );
  });
  return tree;
}

/** Every literal string rendered anywhere in the tree. */
function allText(tree: TestRenderer): string[] {
  return tree.root
    .findAllByType(RNText)
    .flatMap((node: TestInstance) =>
      React.Children.toArray(node.props.children as React.ReactNode).filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

/** Minimal flatten so assertions do not depend on style array shape. */
function flattenStyle(style: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.assign(out, value);
  };
  visit(style);
  return out;
}

const dataOf = (tree: TestRenderer) => tree.root.findByType(FlatList).props.data as Skill[];

describe('SkillsListScreen', () => {
  // Paper cannot see the mocked icon package and says so on every render. The
  // warning is an artefact of the mock, not of the screen.
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

  it('renders the skills in a scrolling list, not a fixed-height view', () => {
    expect(renderScreen().root.findAllByType(FlatList)).toHaveLength(1);
  });

  it('hands every skill to the list, so none is stranded off-screen', () => {
    const listed = dataOf(renderScreen()).map((item) => item.name);
    expect(listed.slice().sort()).toEqual(mockSkills.map((s) => s.name).sort());
  });

  it('sorts featured first, then by proficiency, then by name', () => {
    expect(dataOf(renderScreen()).map((s) => s.name)).toEqual([
      // featured
      'TypeScript',
      // expert
      'Docker',
      'Git',
      // advanced
      'JavaScript',
      'PostgreSQL',
      'React',
      // intermediate
      'Django',
      'Figma',
      'Go',
      'Kubernetes',
      'Redis',
      // beginner
      'Python',
    ]);
  });

  it('shows each skill on a card carrying its category and level', () => {
    const labels = allText(renderScreen());
    expect(labels).toContain('TypeScript');
    // Level reads as a badge, the way a project's status does.
    expect(labels).toContain('Expert');
    // The supporting line names the category, and the years when there are any.
    expect(labels).toContain('Language');
  });

  it('leaves room below the list so the FAB never covers the last row', () => {
    const list = renderScreen().root.findByType(FlatList);
    expect(flattenStyle(list.props.contentContainerStyle).paddingBottom).toBeGreaterThan(60);
  });

  it('offers a filter chip per non-empty category and none for empty ones', () => {
    const labels = allText(renderScreen());
    expect(labels).toContain('All');
    expect(labels).toContain('Language');
    expect(labels).toContain('DevOps');
    // Nothing in the fixture is a soft skill, so that chip must not appear.
    expect(labels).not.toContain('Soft Skill');
  });

  it('draws its own header instead of the navigator one', () => {
    mockStackOptions.length = 0;
    renderScreen();
    const options = mockStackOptions[mockStackOptions.length - 1];
    // The navigator's header would apply the top safe-area inset a second
    // time, leaving a gap between the title and the search field.
    expect(options).toMatchObject({ headerShown: false });
  });

  it('shows the title once, in the page, with a back control beside it', () => {
    const tree = renderScreen();
    expect(allText(tree).filter((t) => t === 'Skills')).toHaveLength(1);
    const back = tree.root.findAll((node) => node.props.accessibilityLabel === 'Go back');
    expect(back.length).toBeGreaterThan(0);
  });
});
