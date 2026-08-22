/**
 * Production-only behaviour of the API client.
 *
 * In development the backend host is inferred from Metro. A release build has
 * no Metro, so that inference used to fall back to `localhost` — which on a
 * phone means the phone itself. Every request then failed with a generic
 * network error that gave no hint the actual problem was a missing
 * EXPO_PUBLIC_API_URL.
 */

describe('resolveApiBaseUrl in a release build', () => {
  const ORIGINAL_ENV = process.env.EXPO_PUBLIC_API_URL;
  const ORIGINAL_DEV = (global as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = ORIGINAL_ENV;
    (global as { __DEV__?: boolean }).__DEV__ = ORIGINAL_DEV;
  });

  it('returns undefined rather than localhost when nothing is configured', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    (global as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { resolveApiBaseUrl } = require('../src/lib/api/client');
      expect(resolveApiBaseUrl()).toBeUndefined();
    });
  });

  it('uses EXPO_PUBLIC_API_URL when it is set, in or out of dev', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
    (global as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { resolveApiBaseUrl } = require('../src/lib/api/client');
      // A trailing slash would double up when a path is appended.
      expect(resolveApiBaseUrl()).toBe('https://api.example.com');
    });
  });

  it('flags an insecure http:// address outside development', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.example.com';
    (global as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { describeApiConfigProblem } = require('../src/lib/api/client');
      expect(describeApiConfigProblem()).toMatch(/https/i);
    });
  });

  it('allows http:// in development, for the LAN backend', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.5:5000';
    (global as { __DEV__?: boolean }).__DEV__ = true;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { describeApiConfigProblem } = require('../src/lib/api/client');
      expect(describeApiConfigProblem()).toBeUndefined();
    });
  });

  it('rejects a request immediately with a clear reason instead of a raw network error', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    (global as { __DEV__?: boolean }).__DEV__ = false;
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { apiRequest, ApiError } = require('../src/lib/api/client');
      await expect(apiRequest('/api/health')).rejects.toMatchObject({
        constructor: ApiError,
        message: expect.stringMatching(/server address/i),
      });
    });
  });
});

describe('setUnauthorizedHandler', () => {
  it('fires only for a request that carried a token', async () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    (global as { __DEV__?: boolean }).__DEV__ = false;

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: 'Unauthorized' }),
    });

    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { apiRequest, setUnauthorizedHandler } = require('../src/lib/api/client');
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      // No token: a 401 here is a bad password, not an expired session.
      await apiRequest('/api/auth/login', { method: 'POST' }).catch(() => undefined);
      expect(handler).not.toHaveBeenCalled();

      // With a token: the server is rejecting our session.
      await apiRequest('/api/portfolio', { token: 'stale-jwt' }).catch(() => undefined);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    global.fetch = originalFetch;
  });
});
