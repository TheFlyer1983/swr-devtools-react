import {
  createCacheActions,
  createCacheStore,
  filterEntries,
  sortEntries,
  type CacheActions,
  type CacheEntry,
  type CacheObserverMode,
  type SortBy
} from '@swr-devtools-react/core';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement
} from 'react';
import { useSWRConfig } from 'swr';
import { KeyDetail } from './key-detail.tsx';
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

const SORT_OPTIONS: { value: SortBy; name: string }[] = [
  { value: 'key', name: 'Key' },
  { value: 'status', name: 'Status' },
  { value: 'updated', name: 'Last updated' }
];

/**
 * The panel's content: a header, a filter and sort bar, the key list and,
 * once a key is selected, its details.
 */
export function Panel({ view, onClose }: PanelProps): ReactElement {
  const { entries, mode, actions } = view;
  // Sorting by key by default keeps rows still while keys revalidate.
  const [sortBy, setSortBy] = useState<SortBy>('key');
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () => sortEntries(filterEntries(entries, query), sortBy),
    [entries, query, sortBy]
  );
  const isFiltered = query.trim() !== '';
  // Looked up in every entry, not only the visible ones, so filtering the
  // list doesn't close the details. A deleted key's details close; they come
  // back if the key does.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = entries.find((entry) => entry.key === selectedKey);
  const sortId = useId();

  return (
    <div className="panel-content">
      <header className="header">
        <span className="title">SWR Devtools</span>
        <span className="mode">
          {isFiltered ? `${visible.length} of ${entries.length}` : entries.length} keys ({mode})
        </span>
        <span className="header-actions">
          <ClearAll onConfirm={() => void actions.clearAll()} />
          {onClose && (
            <button type="button" aria-label="Close SWR Devtools" onClick={onClose}>
              Close
            </button>
          )}
        </span>
      </header>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Filter keys"
          aria-label="Filter keys"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="sort-label" htmlFor={sortId}>
          Sort by
        </label>
        <select
          id={sortId}
          className="sort"
          value={sortBy}
          onChange={(event) => {
            const option = SORT_OPTIONS.find(({ value }) => value === event.target.value);
            if (option) setSortBy(option.value);
          }}
        >
          {SORT_OPTIONS.map(({ value, name }) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="main">
        <div className="split" data-detail={selected ? '' : undefined}>
          <div className="body">
            {entries.length === 0 ? (
              <p className="empty">No keys in the cache yet.</p>
            ) : visible.length === 0 ? (
              <p className="empty">No keys match “{query.trim()}”.</p>
            ) : (
              <KeyList
                entries={visible}
                selectedKey={selected ? selected.key : null}
                onSelect={setSelectedKey}
              />
            )}
          </div>
          {selected && (
            // Keyed so a different key's tree starts collapsed again.
            <KeyDetail
              key={selected.key}
              entry={selected}
              actions={actions}
              onClose={() => setSelectedKey(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clear all, behind a confirmation in the header. The panel's own, rather
 * than `window.confirm`, which blocks the page and can be switched off.
 */
function ClearAll({ onConfirm }: { onConfirm: () => void }): ReactElement {
  const [confirming, setConfirming] = useState(false);
  const clearRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Only move focus after the user acts, not when the panel first renders.
  const hasActed = useRef(false);

  useEffect(() => {
    if (!hasActed.current) return;
    // Cancel is the safe default, and focus returns to Clear all afterwards.
    (confirming ? cancelRef : clearRef).current?.focus();
  }, [confirming]);

  const setAndFocus = (next: boolean) => {
    hasActed.current = true;
    setConfirming(next);
  };

  if (!confirming) {
    return (
      <button type="button" ref={clearRef} onClick={() => setAndFocus(true)}>
        Clear all
      </button>
    );
  }

  return (
    <span
      className="confirm"
      role="group"
      aria-label="Confirm Clear all"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setAndFocus(false);
      }}
    >
      <span className="confirm-text">Clear every key?</span>
      <button
        type="button"
        className="danger"
        onClick={() => {
          onConfirm();
          setAndFocus(false);
        }}
      >
        Clear
      </button>
      <button type="button" ref={cancelRef} onClick={() => setAndFocus(false)}>
        Cancel
      </button>
    </span>
  );
}
