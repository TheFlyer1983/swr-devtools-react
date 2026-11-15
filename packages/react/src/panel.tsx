import {
  createCacheActions,
  createCacheStore,
  type CacheActions,
  type CacheEntry,
  type CacheObserverMode
} from '@swr-devtools-react/core';
import { useMemo, useSyncExternalStore, type ReactElement } from 'react';
import { useSWRConfig } from 'swr';
import { KeyList } from './key-list.tsx';

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

/** The panel's content: a header, and the key list. */
export function Panel({ view, onClose }: PanelProps): ReactElement {
  const { entries, mode, actions } = view;

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
        <KeyList entries={entries} actions={actions} />
      </div>
    </div>
  );
}
