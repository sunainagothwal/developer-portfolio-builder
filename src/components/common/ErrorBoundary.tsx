import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render error anywhere below it.
 *
 * Without this, React unmounts the whole tree on an uncaught error and the
 * app shows a blank white screen with no way back in — no crash report, no
 * "try again", nothing. In development that error is visible in the Metro
 * overlay, which is exactly why it went unnoticed until now: a release build
 * has no such overlay.
 *
 * Deliberately has no dependency on navigation or app stores — anything it
 * touches could itself be mid-crash, and the fallback has to render
 * regardless of what broke.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // A real deployment would forward this to a crash reporter (Sentry,
    // Bugsnag). Logged for now so it is at least visible in device logs.
    console.error('[ErrorBoundary] caught a render error:', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an unexpected error. Your data is safe — it lives on this device and in
            your account.
          </Text>
          {__DEV__ ? (
            <Text style={styles.debug} selectable>
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </Text>
          ) : null}
          <Button mode="contained" onPress={this.reset} style={styles.button}>
            Try again
          </Button>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // Fixed colors, not the app's theme: the theme provider is a child of this
  // boundary and may be exactly what crashed.
  container: { flex: 1, backgroundColor: '#0B0E14' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message: { color: '#B8B8C4', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  debug: { color: '#F97362', fontSize: 11, marginBottom: 20, fontFamily: 'monospace' },
  button: { marginTop: 4 },
});
