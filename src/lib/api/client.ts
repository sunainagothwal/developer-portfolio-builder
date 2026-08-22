import Constants from 'expo-constants';

/**
 * Talks to the resume-analyzer backend, which owns MongoDB.
 *
 * The app cannot reach MongoDB itself: the driver needs Node TCP sockets that
 * React Native does not have. Everything persisted server-side therefore goes
 * through this HTTP client.
 */

const DEFAULT_PORT = 5000;

/**
 * Where the backend lives.
 *
 * `localhost` means the phone itself, so a device can never use it. In
 * development the LAN address is already known — Metro is being served from it
 * — so the host is taken from Expo's `hostUri` and only the port swapped. Set
 * EXPO_PUBLIC_API_URL to override (a deployed backend, a different port).
 */
export function resolveApiBaseUrl(): string | undefined {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/+$/, '');

  // Only development can infer it: the host serving the JS is the dev machine,
  // which is also running the backend.
  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

    const host = hostUri?.split(':')[0];
    if (host) return `http://${host}:${DEFAULT_PORT}`;
  }

  // A release build has no Metro to infer from. Returning localhost here — as
  // this used to — pointed the app at the phone itself, so every request failed
  // with a network error that blamed the connection rather than the missing
  // configuration.
  return undefined;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Why the app cannot talk to a server, if it cannot.
 *
 * A release build must be told where the backend lives, over HTTPS: Android
 * blocks cleartext traffic by default from API 28, so an http:// address fails
 * once the app is no longer a debug build.
 */
export function describeApiConfigProblem(): string | undefined {
  if (!API_BASE_URL) {
    return 'This build has no server address configured. Set EXPO_PUBLIC_API_URL and rebuild.';
  }
  if (!__DEV__ && API_BASE_URL.startsWith('http://')) {
    return 'This build points at an insecure http:// address, which Android blocks. Use https://.';
  }
  return undefined;
}

/**
 * Called when the server rejects our token.
 *
 * The JWT lasts seven days and there is no refresh, so an expired one made
 * every sync fail quietly for ever while the app still looked signed in. The
 * auth store registers a handler that ends the session instead.
 */
let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * No request may hang for ever. React Native's fetch has no default timeout,
 * and a stalled one froze the sign-in screen: the button that started it stays
 * disabled until the promise settles, so every control on the page went dead
 * while the account had in fact been created.
 */
const DEFAULT_TIMEOUT_MS = 15000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  /** Requests that may legitimately return no content. */
  allowEmpty?: boolean;
  timeoutMs?: number;
}

/**
 * One request. Returns undefined for 204, so callers can tell "nothing stored
 * yet" apart from "stored something empty".
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
  const { method = 'GET', body, token, allowEmpty, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Fail with the real reason rather than a misleading connection error.
  const configProblem = describeApiConfigProblem();
  if (configProblem || !API_BASE_URL) {
    throw new ApiError(configProblem ?? 'The server address is not configured.', 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // A network-level failure says nothing useful on its own; naming the
    // address turns "Network request failed" into something actionable.
    const timedOut = (error as { name?: string } | undefined)?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? `The server at ${API_BASE_URL} did not respond within ${Math.round(timeoutMs / 1000)}s.`
        : `Could not reach the server at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) {
    if (allowEmpty) return undefined;
    throw new ApiError('The server returned no content', 204);
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    // Only a request that actually carried a token can have had it rejected.
    if (response.status === 401 && token) onUnauthorized?.();

    const message =
      (payload as { error?: string } | undefined)?.error ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
