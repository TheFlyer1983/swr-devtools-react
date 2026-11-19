import type { CacheActions, CacheEntry, KeyKind, KeyStatus } from '@swr-devtools-react/core';
import { useEffect, useState, type ReactElement } from 'react';

const STATUS_NAMES: Record<KeyStatus, string> = {
  loading: 'Loading',
  validating: 'Validating',
  success: 'Success',
  error: 'Error',
  idle: 'Idle'
};

/** Standard keys get no label; they're most of the list. */
const KIND_NAMES: Record<Exclude<KeyKind, 'standard'>, string> = {
  infinite: 'Infinite',
  subscription: 'Subscription'
};

export interface KeyListProps {
  entries: CacheEntry[];
  actions: CacheActions;
}

/** The given keys, each with its status and how long ago it was updated. */
export function KeyList({ entries, actions }: KeyListProps): ReactElement {
  const now = useNow(1000);

  return (
    <ul className="key-list" aria-label="Cache keys">
      {entries.map((entry) => (
        <li key={entry.key} className="key-row">
          {/* The name is shown, not only the colour, so status doesn't rely on colour. */}
          <span className="badge" data-status={entry.status}>
            {STATUS_NAMES[entry.status]}
          </span>
          <span className="key" title={entry.label}>
            {entry.label}
          </span>
          {entry.kind !== 'standard' && <span className="kind">{KIND_NAMES[entry.kind]}</span>}
          <time
            className="age"
            dateTime={new Date(entry.updatedAt).toISOString()}
            title={new Date(entry.updatedAt).toLocaleString()}
          >
            {formatAge(now - entry.updatedAt)}
          </time>
          {/* Moves to the key detail view with #15. */}
          <span className="actions">
            <button type="button" onClick={() => void actions.revalidate(entry.key)}>
              Revalidate
            </button>
            <button type="button" onClick={() => void actions.remove(entry.key)}>
              Delete
            </button>
          </span>
        </li>
      ))}
    </ul>
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
