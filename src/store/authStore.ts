import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, setUnauthorizedHandler } from '@lib/api/client';
import { pullPortfolio, pushPortfolio } from '@lib/sync/portfolioSync';
import { cancelScheduledSync, registerTokenProvider } from '@lib/sync/syncScheduler';

const AUTH_KEY = '@devportfolio/auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  token?: string;
  user?: AuthUser;
  /** True while a sign-in is syncing the account's data down. */
  syncing: boolean;
  error?: string;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Uploads local data, then clears the session. */
  logout: () => Promise<void>;
  /**
   * Ends the session without uploading. For a token the server has rejected,
   * where a push would only fail again.
   */
  clearSession: (reason?: string) => Promise<void>;
  syncNow: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // The scheduler pushes after local edits. It reads the token through this
  // provider rather than importing the store, which would be circular.
  registerTokenProvider(() => get().token);

  // The seven-day JWT has no refresh. When the server rejects it, end the
  // session so the user is asked to sign in again, instead of leaving an app
  // that looks signed in while every sync fails silently.
  setUnauthorizedHandler(() => {
    if (!get().token) return;
    void get().clearSession('Your session expired. Please sign in again.');
  });

  /**
   * Shared tail of every sign-in path.
   *
   * Resolves as soon as the credentials are accepted and the session is
   * stored. The portfolio transfer runs on afterwards, deliberately not
   * awaited: the caller disables its form while this promise is pending, so
   * waiting for the sync here left every button on the sign-in screen dead —
   * with the account already created — for as long as the transfer took.
   */
  const establishSession = async (auth: AuthResponse) => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    set({ token: auth.token, user: auth.user, status: 'signedIn', syncing: true, error: undefined });

    void pullPortfolio(auth.token)
      .catch((e: unknown) => {
        // The credentials were fine; only the data transfer failed. Recorded
        // rather than thrown, so it can never read as a rejected login. The
        // next local change schedules another push.
        const message = e instanceof Error ? e.message : 'Could not load your saved data.';
        console.warn('[auth] signed in, but the initial sync failed:', message);
        set({ error: message });
      })
      .finally(() => set({ syncing: false }));
  };

  return {
    status: 'loading',
    syncing: false,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (!raw) return set({ status: 'signedOut' });
        const saved = JSON.parse(raw) as AuthResponse;
        set({ token: saved.token, user: saved.user, status: 'signedIn' });
      } catch {
        set({ status: 'signedOut' });
      }
    },

    login: async (email, password) => {
      set({ error: undefined });
      const auth = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (auth) await establishSession(auth);
    },

    register: async (name, email, password) => {
      set({ error: undefined });
      const auth = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      if (auth) await establishSession(auth);
    },

    loginWithGoogle: async (idToken) => {
      set({ error: undefined });
      const auth = await apiRequest<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: { idToken },
      });
      if (auth) await establishSession(auth);
    },

    logout: async () => {
      const { token } = get();
      // Drop any queued push; the explicit one below supersedes it.
      cancelScheduledSync();
      // Push before clearing, so the last edits are not the ones that get lost.
      if (token) {
        try {
          await pushPortfolio(token);
        } catch {
          /* offline: the stored snapshot stays as it was */
        }
      }
      await AsyncStorage.removeItem(AUTH_KEY);
      set({ token: undefined, user: undefined, status: 'signedOut', error: undefined });
    },

    clearSession: async (reason) => {
      cancelScheduledSync();
      await AsyncStorage.removeItem(AUTH_KEY);
      set({ token: undefined, user: undefined, status: 'signedOut', syncing: false, error: reason });
    },

    syncNow: async () => {
      const { token } = get();
      if (!token) return;
      await pushPortfolio(token);
    },

    clearError: () => set({ error: undefined }),
  };
});
