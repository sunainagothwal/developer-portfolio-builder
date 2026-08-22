/**
 * A screen must not pad the top safe area twice.
 *
 * `Screen` used to apply `edges={['top']}` for everyone, but 24 of the 30
 * screens sit under the navigator's header, which has already consumed that
 * inset. The result was a band of dead space between the header and the
 * content on every one of them.
 *
 * Only the six screens that draw no native header — the four tabs, plus
 * Projects and Skills, which set `headerShown: false` — should ask for it.
 */

import * as fs from 'fs';
import * as path from 'path';

const FEATURES = path.join(__dirname, '..', 'src', 'features');

/** Screens with no navigator header, which therefore need the inset. */
const NO_NATIVE_HEADER = [
  'dashboard/screens/DashboardScreen.tsx',
  'dashboard/screens/HubScreen.tsx',
  'notes/screens/NotesListScreen.tsx',
  'settings/screens/SettingsScreen.tsx',
  'projects/screens/ProjectsListScreen.tsx',
  'skills/screens/SkillsListScreen.tsx',
];

function screenFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return screenFiles(full);
    return entry.name.endsWith('.tsx') && fs.readFileSync(full, 'utf8').includes('<Screen')
      ? [full]
      : [];
  });
}

/** The opening <Screen ...> tag, or undefined. */
function screenTag(file: string): string | undefined {
  return /<Screen(\s[^>]*?)?>/.exec(fs.readFileSync(file, 'utf8'))?.[0];
}

describe('Screen safe-area insets', () => {
  const files = screenFiles(FEATURES);

  it('finds the screens to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('defaults to no top inset', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'components', 'layouts', 'Screen.tsx'),
      'utf8',
    );
    expect(source).toContain('edges = []');
  });

  it('asks for the top inset only where there is no native header', () => {
    const asking = files
      .filter((file) => screenTag(file)?.includes("edges={['top']}"))
      .map((file) => path.relative(FEATURES, file).split(path.sep).join('/'))
      .sort();

    expect(asking).toEqual([...NO_NATIVE_HEADER].sort());
  });

  it('leaves every header-bearing screen without it', () => {
    const headered = files.filter(
      (file) =>
        !NO_NATIVE_HEADER.includes(path.relative(FEATURES, file).split(path.sep).join('/')),
    );

    for (const file of headered) {
      expect(screenTag(file)).not.toContain('edges');
    }
  });
});
