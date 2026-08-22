/**
 * Reloads the in-memory stores after the database is replaced underneath them.
 *
 * A pull rewrites SQLite directly through the repositories, which the zustand
 * stores never see. Signing in on a device that already held data therefore
 * left the screens showing the old rows until each one happened to remount —
 * the account's real data was on the device but invisible.
 *
 * Stores register through here rather than being imported, so this module
 * stays free of the cycle stores -> sync -> stores.
 */

type Reload = () => Promise<void>;

const reloaders = new Set<Reload>();

export function registerStoreReloader(reload: Reload): () => void {
  reloaders.add(reload);
  return () => reloaders.delete(reload);
}

/** Reloads every registered store. Failures are per-store and non-fatal. */
export async function refreshAllStores(): Promise<void> {
  await Promise.all(
    [...reloaders].map((reload) =>
      reload().catch((error) => {
        console.warn('[sync] a store failed to reload after a pull:', error);
      }),
    ),
  );
}
