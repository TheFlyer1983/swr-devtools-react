import { createCacheActions, createCacheStore } from '@swr-devtools-react/core';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useSWRConfig } from 'swr';

export interface SWRDevtoolsProps {
  /** Start with the panel open. */
  initialIsOpen?: boolean;
}

/**
 * Temporary readout of the live cache, with buttons for the core actions, so
 * #7, #8 and #9 can be checked in the playground. The panel shell (#11) and key list (#12) replace it.
 */
export function SWRDevtools({ initialIsOpen = false }: SWRDevtoolsProps): ReactElement {
  const config = useSWRConfig();
  const { cache } = config;
  // Creating the store only reads the cache; the patch is installed when
  // useSyncExternalStore subscribes, after React commits.
  const store = useMemo(() => createCacheStore(cache), [cache]);
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const actions = useMemo(() => createCacheActions(config), [config]);
  const now = useNow(1000);

  return (
    <div data-swr-devtools="" data-open={initialIsOpen}>
      <p>
        SWR Devtools: {entries.length} keys ({store.getMode()}){' '}
        <button
          type="button"
          onClick={() => {
            // The spec puts Clear all behind a confirmation. The panel (#15)
            // replaces this with its own dialog.
            if (window.confirm('Clear every key from the SWR cache?')) void actions.clearAll();
          }}
        >
          Clear all
        </button>
      </p>
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
              <td>{entry.label}</td>
              <td>{entry.kind}</td>
              <td>{entry.status}</td>
              <td>{formatAge(now - entry.updatedAt)}</td>
              <td>
                <button type="button" onClick={() => void actions.revalidate(entry.key)}>
                  Revalidate
                </button>{' '}
                <button type="button" onClick={() => void actions.remove(entry.key)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
