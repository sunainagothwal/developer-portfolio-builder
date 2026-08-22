import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Button, HelperText } from 'react-native-paper';
import { useGoogleSignIn, isGoogleSignInConfigured } from '@lib/auth/googleSignIn';

interface GoogleSignInButtonProps {
  onToken: (idToken: string) => Promise<void> | void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * The half that actually talks to Google.
 *
 * Split into its own component on purpose: `useGoogleSignIn` throws during
 * render when the running platform has no client ID, and a hook cannot be
 * called conditionally inside one component. Mounting this one conditionally
 * is what keeps that throw away from the sign-in screen.
 */
const ConfiguredGoogleButton: React.FC<GoogleSignInButtonProps> = ({ onToken, onError, disabled }) => {
  const { signIn, ready } = useGoogleSignIn();

  const press = async () => {
    try {
      const idToken = await signIn();
      // null means the user closed the Google sheet; that is not an error.
      if (idToken) await onToken(idToken);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Google sign-in failed.');
    }
  };

  return (
    <Button mode="outlined" icon="google" onPress={press} disabled={disabled || !ready} style={styles.button}>
      Continue with Google
    </Button>
  );
};

/** Shown when this platform has no client ID, instead of crashing. */
const UnconfiguredGoogleButton: React.FC = () => (
  <>
    <Button mode="outlined" icon="google" disabled style={styles.button}>
      Continue with Google
    </Button>
    <HelperText type="info" visible style={styles.note}>
      {`Google sign-in needs an ${Platform.OS} client ID. Add EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID to .env, then restart with -c.`}
    </HelperText>
  </>
);

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = (props) =>
  isGoogleSignInConfigured() ? <ConfiguredGoogleButton {...props} /> : <UnconfiguredGoogleButton />;

const styles = StyleSheet.create({
  button: { borderWidth: 1 },
  note: { textAlign: 'center' },
});
