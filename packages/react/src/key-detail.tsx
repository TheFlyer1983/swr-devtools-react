import type { CacheEntry } from '@swr-devtools-react/core';
import type { ReactElement } from 'react';
import { JsonTree } from './json-tree.tsx';
import { KIND_NAMES, StatusBadge } from './key-list.tsx';

export interface KeyDetailProps {
  entry: CacheEntry;
  onClose: () => void;
}

/** One key in full: its key, status, error (if any) and data. */
export function KeyDetail({ entry, onClose }: KeyDetailProps): ReactElement {
  return (
    <section className="detail" aria-label="Key details">
      <header className="detail-header">
        <StatusBadge status={entry.status} />
        <h2 className="detail-key">{entry.label}</h2>
        <button type="button" aria-label="Close key details" onClick={onClose}>
          ✕
        </button>
      </header>
      <dl className="detail-meta">
        {entry.kind !== 'standard' && (
          <>
            <dt>Type</dt>
            <dd>{KIND_NAMES[entry.kind]}</dd>
          </>
        )}
        {/* SWR's serialised form, as it appears in the cache and in mutate(). */}
        {entry.key !== entry.label && (
          <>
            <dt>Cache key</dt>
            <dd className="detail-raw-key">{entry.key}</dd>
          </>
        )}
        <dt>Updated</dt>
        <dd>
          <time dateTime={new Date(entry.updatedAt).toISOString()}>
            {new Date(entry.updatedAt).toLocaleString()}
          </time>
        </dd>
      </dl>
      {entry.error !== undefined && (
        <>
          <h3 className="detail-heading">Error</h3>
          <JsonTree value={entry.error} label="Error" />
        </>
      )}
      <h3 className="detail-heading">Data</h3>
      <JsonTree value={entry.data} label="Data" />
    </section>
  );
}
