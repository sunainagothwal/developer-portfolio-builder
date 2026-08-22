/**
 * Without an error boundary, an uncaught render error unmounts the whole tree
 * and the app shows a blank screen with no recovery path — invisible in
 * development, where Metro's red-box overlay hides it, but fatal in a release
 * build.
 */

import React, { act } from 'react';
import { Text } from 'react-native';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

/** Untyped, matching how the rest of the suite avoids @types/react-test-renderer. */
interface TestInstance {
  props: Record<string, unknown>;
  findByType: (type: unknown) => TestInstance;
  findAllByType: (type: unknown) => TestInstance[];
}
interface TestRenderer {
  root: TestInstance;
}

/* eslint-disable @typescript-eslint/no-var-requires */
const renderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => TestRenderer;
};
/* eslint-enable @typescript-eslint/no-var-requires */

const Bomb: React.FC = () => {
  throw new Error('render exploded');
};

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    // React logs the caught error to console.error; expected here.
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children normally when nothing throws', () => {
    let tree!: TestRenderer;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <Text>All good</Text>
        </ErrorBoundary>,
      );
    });
    expect(tree.root.findByType(Text).props.children).toBe('All good');
  });

  it('shows a fallback instead of unmounting the whole tree', () => {
    let tree!: TestRenderer;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );
    });

    const texts = tree.root
      .findAllByType(Text)
      .map((n: TestInstance) => n.props.children as React.ReactNode);
    expect(texts.flat().join(' ')).toMatch(/something went wrong/i);
  });
});
