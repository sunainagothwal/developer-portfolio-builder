/**
 * Signing in must not wait for the portfolio transfer.
 *
 * The sign-in screen disables its form while `register()`/`login()` is
 * pending. When the session helper awaited the data sync, a stalled transfer
 * left every button on that screen dead — including "I already have an
 * account" — while the account had in fact been created. Nothing on screen
 * said so, so it read as a broken button.
 */

const mockPull = jest.fn();
const mockPush = jest.fn();
const mockApiRequest = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@lib/api/client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  ApiError: class extends Error {},
  setUnauthorizedHandler: jest.fn(),
}));

jest.mock('@lib/sync/portfolioSync', () => ({
  pullPortfolio: (...args: unknown[]) => mockPull(...args),
  pushPortfolio: (...args: unknown[]) => mockPush(...args),
}));

jest.mock('@lib/sync/syncScheduler', () => ({
  registerTokenProvider: jest.fn(),
  cancelScheduledSync: jest.fn(),
  scheduleSync: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const { useAuthStore } = require('@store/authStore');
/* eslint-enable @typescript-eslint/no-var-requires */

const AUTH = { token: 'jwt-123', user: { id: 'u1', name: 'Jane', email: 'jane@example.com' } };

describe('authStore.register / login', () => {
  beforeEach(() => {
    mockApiRequest.mockReset().mockResolvedValue(AUTH);
    mockPull.mockReset().mockResolvedValue({ status: 'seeded' });
    mockPush.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ status: 'signedOut', token: undefined, user: undefined, syncing: false, error: undefined });
  });

  it('resolves as soon as the credentials are accepted', async () => {
    // A transfer that never settles, which is what froze the screen.
    mockPull.mockReturnValue(new Promise(() => {}));

    await expect(
      useAuthStore.getState().register('Jane', 'jane@example.com', 'hunter2hunter2'),
    ).resolves.toBeUndefined();

    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().token).toBe('jwt-123');
  });

  it('signs the user in even when the transfer fails outright', async () => {
    mockPull.mockRejectedValue(new Error('did not respond within 15s'));

    await expect(
      useAuthStore.getState().login('jane@example.com', 'hunter2hunter2'),
    ).resolves.toBeUndefined();

    expect(useAuthStore.getState().status).toBe('signedIn');
    // Recorded so it can be surfaced, but never thrown at the sign-in form.
    await new Promise((resolve) => setImmediate(resolve));
    expect(useAuthStore.getState().error).toMatch(/did not respond/);
  });

  it('still reports a genuinely rejected credential', async () => {
    mockApiRequest.mockRejectedValue(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('jane@example.com', 'wrong')).rejects.toThrow(
      'Invalid credentials',
    );
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('starts the transfer, rather than skipping it', async () => {
    await useAuthStore.getState().register('Jane', 'jane@example.com', 'hunter2hunter2');
    expect(mockPull).toHaveBeenCalledWith('jwt-123');
  });
});

describe('authStore.clearSession', () => {
  beforeEach(() => {
    mockApiRequest.mockReset().mockResolvedValue(AUTH);
    mockPull.mockReset().mockResolvedValue({ status: 'seeded' });
    useAuthStore.setState({
      status: 'signedIn',
      token: AUTH.token,
      user: AUTH.user,
      syncing: false,
      error: undefined,
    });
  });

  it('ends the session without attempting to push, for a token the server already rejected', async () => {
    await useAuthStore.getState().clearSession('Your session expired. Please sign in again.');

    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().token).toBeUndefined();
    // A push here would only repeat the same 401 the caller is reacting to.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('records the reason so the sign-in screen can show it', async () => {
    await useAuthStore.getState().clearSession('Your session expired. Please sign in again.');
    expect(useAuthStore.getState().error).toMatch(/session expired/i);
  });
});
