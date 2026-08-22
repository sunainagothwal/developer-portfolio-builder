import { AppState } from 'react-native';
import { pushPortfolio } from './portfolioSync';

/**
 * Pushes the portfolio to the user's account shortly after anything changes.
 *
 * Without this, data only reached MongoDB on sign-out or a manual sync, so
 * reinstalling the app without signing out first lost everything since the
 * last push — the exact thing storing it server-side is meant to prevent.
 *
 * The token arrives through a registered provider rather than an import of
 * the auth store. The store already imports this module's sibling, and reading
 * it from here would close the loop into a circular import.
 */

/** Edits arrive in bursts; one push per burst is enough. */
const DEBOUNCE_MS = 4000;

let getToken: (() => string | undefined) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | undefined;

export function registerTokenProvider(provider: () => string | undefined): void {
  getToken = provider;
}

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

/** Called after any local mutation. A no-op when signed out. */
export function scheduleSync(): void {
  if (!getToken?.()) return;
  clearTimer();
  timer = setTimeout(() => {
    timer = undefined;
    void runPush();
  }, DEBOUNCE_MS);
}

/** Cancels a pending push, for sign-out. */
export function cancelScheduledSync(): void {
  clearTimer();
}

/** Runs any pending push immediately and waits for it. */
export async function flushSync(): Promise<void> {
  clearTimer();
  await runPush();
}

// A debounced push queued right before the user backgrounds or kills the app
// never fires — the JS timer is suspended with it. Flushing on the
// background transition is what actually gets that edit to the server rather
// than only "eventually, if the app stays open long enough".
AppState.addEventListener('change', (state) => {
  if (state !== 'active') void flushSync();
});

async function runPush(): Promise<void> {
  const token = getToken?.();
  if (!token) return;

  // Serialise: two overlapping pushes would race to be the stored snapshot,
  // and the loser could be the newer one.
  if (inFlight) {
    await inFlight.catch(() => undefined);
  }

  inFlight = pushPortfolio(token)
    .catch((error) => {
      // Offline or the server is down. The next change reschedules, and
      // sign-out pushes as well, so nothing is permanently stranded.
      console.warn('[sync] deferred:', error instanceof Error ? error.message : error);
    })
    .finally(() => {
      inFlight = undefined;
    });

  await inFlight;
}
