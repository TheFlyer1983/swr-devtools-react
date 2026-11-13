import type { Cache, State } from 'swr';

/**
 * How changes are detected:
 * - `patch`: `set`/`delete` on the cache are wrapped, so every write is seen.
 * - `poll`: the cache couldn't be patched (e.g. it's frozen), so it's compared
 *   on an interval. Short-lived states between polls can be missed.
 */
export type CacheObserverMode = 'patch' | 'poll';

export interface CacheObserver {
  mode: CacheObserverMode;
  /** Stops notifying. Safe to call more than once. */
  unsubscribe: () => void;
}

export interface ObserveCacheOptions {
  /** Poll interval in ms, used only when the cache can't be patched. */
  pollInterval?: number;
}

const DEFAULT_POLL_INTERVAL = 250;

/** One patch per cache object, shared by every listener on it. */
interface Patch {
  listeners: Set<() => void>;
  scheduled: boolean;
  restore(): void;
}

const patches = new WeakMap<Cache, Patch>();

/**
 * Calls `listener` after the SWR cache changes: a key added, changed or
 * removed. Notifications are batched, so many writes in one task produce one
 * call.
 *
 * Wraps `set` and `delete` on the cache object SWR already uses, which needs
 * no setup from the app (see docs/spikes/cache-observation.md). Falls back to
 * polling when the cache can't be patched.
 */
export function observeCache(
  cache: Cache,
  listener: () => void,
  options: ObserveCacheOptions = {}
): CacheObserver {
  const patch = patches.get(cache) ?? installPatch(cache);
  if (!patch) return pollCache(cache, listener, options.pollInterval ?? DEFAULT_POLL_INTERVAL);

  // Wrap the listener so each subscription is distinct, even if the same
  // function is passed twice, and can be removed exactly once.
  const subscription = () => listener();
  patch.listeners.add(subscription);

  let active = true;
  return {
    mode: 'patch',
    unsubscribe() {
      if (!active) return;
      active = false;
      patch.listeners.delete(subscription);
      if (patch.listeners.size === 0) {
        patch.restore();
        patches.delete(cache);
      }
    }
  };
}

function installPatch(cache: Cache): Patch | undefined {
  const ownSet = Object.getOwnPropertyDescriptor(cache, 'set');
  const ownDelete = Object.getOwnPropertyDescriptor(cache, 'delete');
  const originalSet = cache.set.bind(cache);
  const originalDelete = cache.delete.bind(cache);

  const patch: Patch = {
    listeners: new Set(),
    scheduled: false,
    restore() {
      restoreMethod(cache, 'set', ownSet);
      restoreMethod(cache, 'delete', ownDelete);
    }
  };

  const notify = () => {
    if (patch.scheduled) return;
    patch.scheduled = true;
    queueMicrotask(() => {
      patch.scheduled = false;
      for (const listener of patch.listeners) listener();
    });
  };

  try {
    cache.set = (key: string, value: State) => {
      originalSet(key, value);
      notify();
    };
    cache.delete = (key: string) => {
      originalDelete(key);
      notify();
    };
  } catch {
    // Frozen or sealed cache: assignment throws in strict mode.
    patch.restore();
    return undefined;
  }

  patches.set(cache, patch);
  return patch;
}

function restoreMethod(
  cache: Cache,
  name: 'set' | 'delete',
  original: PropertyDescriptor | undefined
): void {
  try {
    if (original) Object.defineProperty(cache, name, original);
    else delete (cache as Partial<Cache>)[name];
  } catch {
    // Nothing was patched on a frozen cache, so there's nothing to restore.
  }
}

function pollCache(cache: Cache, listener: () => void, interval: number): CacheObserver {
  let previous = snapshot(cache);
  const timer = setInterval(() => {
    const next = snapshot(cache);
    if (changed(previous, next)) {
      previous = next;
      listener();
    }
  }, interval);

  return {
    mode: 'poll',
    unsubscribe() {
      clearInterval(timer);
    }
  };
}

function snapshot(cache: Cache): Map<string, State | undefined> {
  const entries = new Map<string, State | undefined>();
  for (const key of cache.keys()) entries.set(key, cache.get(key));
  return entries;
}

function changed(a: Map<string, unknown>, b: Map<string, unknown>): boolean {
  if (a.size !== b.size) return true;
  // SWR replaces the entry object on every write, so reference checks suffice.
  for (const [key, value] of b) {
    if (a.get(key) !== value) return true;
  }
  return false;
}
