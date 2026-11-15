import { createCacheActions, createCacheStore } from '@swr-devtools-react/core';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useSWRConfig } from 'swr';

export interface PanelProps {
  /** Shows a close button in the header. The floating panel passes it. */
  onClose?: () => void;
}

/**
 * The panel's content: a header, and the cache readout. The key list (#12)
 * replaces the readout table.
 *
 * The cache is only observed while this is mounted, so a closed floating
 * panel costs nothing.
 */
export function Panel({ onClose }: PanelProps): ReactElement {
  const config = useSWRConfig();
  const { cache } = config;
  // Creating the store only reads the cache; the patch is installed when
  // useSyncExternalStore subscribes, after React commits.
  const store = useMemo(() => createCacheStore(cache), [cache]);
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const actions = useMemo(() => createCacheActions(config), [config]);
  const now = useNow(1000);

  return (
    <div className="panel-content">
      <header className="header">
        <span className="title">SWR Devtools</span>
        <span className="mode">
          {entries.length} keys ({store.getMode()})
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
