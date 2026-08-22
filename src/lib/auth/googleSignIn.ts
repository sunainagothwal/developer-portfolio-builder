import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

/**
 * Google sign-in.
 *
 * The app obtains a Google **ID token** and hands it to the backend, which
 * verifies it against the client IDs it trusts and returns the app's own JWT
 * (see resume-analyzer/backend/routes/auth.js). The app never handles a Google
 * access token or a client secret.
 *
 * The client IDs come from the Google Cloud console and must be mirrored into
 * the backend's GOOGLE_CLIENT_IDS, or the backend rejects every token as
 * having been issued for another app.
 */

// Lets the browser hand the result back to the app when it redirects.
//
// Guarded because this runs at import time on the landing screen, and
// expo-web-browser is a native module: in a dev client built before it was
// installed, touching it throws.
try {
  WebBrowser.maybeCompleteAuthSession();
} catch (error) {
  console.warn(
    '[auth] expo-web-browser is not available in this build — rebuild the dev client to use Google sign-in.',
    error,
  );
}

export const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

/**
 * The client ID Google will demand on the device currently running.
 *
 * Each platform needs its own: an Android build cannot authenticate with an
 * iOS client ID, so testing an Android app on an iPhone needs an iOS ID too.
 */
export function getPlatformClientId(): string | undefined {
  if (Platform.OS === 'ios') return GOOGLE_CLIENT_IDS.ios;
  if (Platform.OS === 'android') return GOOGLE_CLIENT_IDS.android;
  return GOOGLE_CLIENT_IDS.web;
}

/**
 * Whether Google sign-in can run *here*. Deliberately per-platform: the
 * provider hook throws synchronously during render when the running platform's
 * ID is missing, so this is what decides whether the hook may be mounted.
 */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(getPlatformClientId());
}

export interface GoogleSignIn {
  /** Resolves with an ID token, or null when the user backs out. */
  signIn: () => Promise<string | null>;
  /** False until the auth request has been built. */
  ready: boolean;
}

/**
 * Must be a hook: `useIdTokenAuthRequest` builds the request and its PKCE
 * state during render, so it cannot be called from an onPress handler.
 *
 * Only call this from a component that is mounted when
 * `isGoogleSignInConfigured()` is true — see GoogleSignInButton. The provider
 * throws "Client Id property `iosClientId` must be defined…" during render
 * otherwise, which takes the whole sign-in screen down with it.
 */
export function useGoogleSignIn(): GoogleSignIn {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
  });

  /**
   * The caller's pending promise.
   *
   * On a phone this is a code flow, not an implicit one: `promptAsync`
   * resolves with an authorization `code`, and the provider then exchanges it
   * for tokens in an effect. The `id_token` only ever appears in `response`,
   * one render later — reading it from `promptAsync`'s return value gave
   * undefined every time, so sign-in failed even with a valid client ID.
   */
  const pending = useRef<{
    resolve: (idToken: string | null) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    const waiter = pending.current;
    if (!waiter || !response) return;

    if (response.type === 'success') {
      const idToken =
        (response.params?.id_token as string | undefined) || response.authentication?.idToken;
      // A success with no token yet means the code exchange is still running;
      // this effect runs again when it lands.
      if (!idToken) return;
      pending.current = null;
      waiter.resolve(idToken);
      return;
    }

    pending.current = null;
    if (response.type === 'error') {
      waiter.reject(new Error(response.error?.message ?? 'Google sign-in failed.'));
    } else {
      // 'cancel' and 'dismiss' are the user changing their mind.
      waiter.resolve(null);
    }
  }, [response]);

  const signIn = useCallback(
    () =>
      new Promise<string | null>((resolve, reject) => {
        pending.current = { resolve, reject };
        void promptAsync().then((result) => {
          // Settle the obvious outcomes now; a success waits for the exchange.
          if (result.type !== 'success' && pending.current) {
            pending.current = null;
            resolve(null);
          }
        });
      }),
    [promptAsync],
  );

  return { signIn, ready: Boolean(request) };
}
