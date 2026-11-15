import {
  createCacheActions,
  createCacheStore,
  type CacheActions,
  type CacheEntry,
  type CacheObserverMode
} from '@swr-devtools-react/core';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useSWRConfig } from 'swr';

/** The live cache, and the actions on it, as the panel shows them. */
export interface CacheView {
  entries: CacheEntry[];
  mode: CacheObserverMode;
  actions: CacheActions;
}

/**
 * Watches the nearest SWR cache for as long as the calling component is
 * mounted.
 *
 * SWR doesn't record when data changed, so the reader times changes itself
 * and can only time what it sees. Call this where it lives as long as
 * `<SWRDevtools />`, not inside the panel, so ages are right when the panel
 * opens, the way TanStack Query Devtools shows them. Watching a closed panel
 * is cheap: a wrapped `cache.set` and a batched re-read.
 */
export function useCacheView(): CacheView {
  const config = useSWRConfig();
  const { cache } = config;
  // Creating the store only reads the cache; the patch is installed when
  // useSyncExternalStore subscribes, after React commits.
  const store = useMemo(() => createCacheStore(cache), [cache]);
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const actions = useMemo(() => createCacheActions(config), [config]);
  return { entries, mode: store.getMode(), actions };
}

export interface PanelProps {
  view: CacheView;
  /** Shows a close button in the header. The floating panel passes it. */
  onClose?: () => void;
}

/**
 * The panel's content: a header, and the cache readout. The key list (#12)
 * replaces the readout table.
 */
export function Panel({ view, onClose }: PanelProps): ReactElement {
  const { entries, mode, actions } = view;
  const now = useNow(1000);

  return (
    <div className="panel-content">
      <header className="header">
        <span className="title">SWR Devtools</span>
        <span className="mode">
          {entries.length} keys ({mode})
        </span>
        <span className="header-actions">
          <button
            type="button"
            onClick={() => {
              // The spec puts Clear all behind a confirmation. #15 replaces
              // this with the panel's own dialog.
              if (window.confirm('Clear every key from the SWR cache?')) void actions.clearAll();
            }}
          >
            Clear all
          </button>
          {onClose && (
            <button type="button" aria-label="Close SWR Devtools" onClick={onClose}>
              Close
            </button>
          )}
        </span>
      </header>
      <div className="body">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.key}>
                <td className="key">{entry.label}</td>
                <td>{entry.kind}</td>
                <td className="status" data-status={entry.status}>
                  {entry.status}
                </td>
                <td>{formatAge(now - entry.updatedAt)}</td>
                <td className="actions">
                  <button type="button" onClick={() => void actions.revalidate(entry.key)}>
                    Revalidate
                  </button>
                  <button type="button" onClick={() => void actions.remove(entry.key)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

function formatAge(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
