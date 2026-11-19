import type { CacheEntry, KeyKind, KeyStatus } from '@swr-devtools-react/core';
import { useEffect, useState, type ReactElement } from 'react';

const STATUS_NAMES: Record<KeyStatus, string> = {
  loading: 'Loading',
  validating: 'Validating',
  success: 'Success',
  error: 'Error',
  idle: 'Idle'
};

/** Standard keys get no label; they're most of the list. */
export const KIND_NAMES: Record<Exclude<KeyKind, 'standard'>, string> = {
  infinite: 'Infinite',
  subscription: 'Subscription'
};

/** A key's status, by name as well as colour, so it doesn't rely on colour. */
export function StatusBadge({ status }: { status: KeyStatus }): ReactElement {
  return (
    <span className="badge" data-status={status}>
      {STATUS_NAMES[status]}
    </span>
  );
}

export interface KeyListProps {
  entries: CacheEntry[];
  /** The key whose details are showing, if any. */
  selectedKey: string | null;
  /** Called with a key to show its details, or `null` to hide them. */
  onSelect: (key: string | null) => void;
}

/** The given keys, each with its status and how long ago it was updated. */
export function KeyList({ entries, selectedKey, onSelect }: KeyListProps): ReactElement {
  const now = useNow(1000);

  return (
    <ul className="key-list" aria-label="Cache keys">
      {entries.map((entry) => (
        <li
          key={entry.key}
          className="key-row"
          data-selected={entry.key === selectedKey ? '' : undefined}
        >
          <StatusBadge status={entry.status} />
          {/* Clicking the selected key again hides its details. */}
          <button
            type="button"
            className="key"
            title={entry.label}
            aria-pressed={entry.key === selectedKey}
            onClick={() => onSelect(entry.key === selectedKey ? null : entry.key)}
          >
            {entry.label}
          </button>
          {entry.kind !== 'standard' && <span className="kind">{KIND_NAMES[entry.kind]}</span>}
          <time
            className="age"
            dateTime={new Date(entry.updatedAt).toISOString()}
            title={new Date(entry.updatedAt).toLocaleString()}
          >
            {formatAge(now - entry.updatedAt)}
          </time>
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
