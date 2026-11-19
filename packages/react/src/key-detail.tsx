import type { CacheActions, CacheEntry } from '@swr-devtools-react/core';
import type { ReactElement } from 'react';
import { JsonTree } from './json-tree.tsx';
import { KIND_NAMES, StatusBadge } from './key-list.tsx';

export interface KeyDetailProps {
  entry: CacheEntry;
  actions: CacheActions;
  onClose: () => void;
}

/**
 * Why Revalidate can't refetch a key, if it can't. `mutate(key)` refetches
 * through the key's mounted hook, and a subscription's hook has no fetcher.
 */
const REVALIDATE_UNAVAILABLE: Partial<Record<CacheEntry['kind'], string>> = {
  subscription: 'Subscription keys have no fetcher, so they can’t be revalidated.'
};

/** One key in full: its key, status, error (if any) and data, with actions. */
export function KeyDetail({ entry, actions, onClose }: KeyDetailProps): ReactElement {
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
      <div className="detail-actions">
        <RevalidateButton
          reason={REVALIDATE_UNAVAILABLE[entry.kind]}
          onClick={() => void actions.revalidate(entry.key)}
        />
        <button type="button" className="danger" onClick={() => void actions.remove(entry.key)}>
          Delete
        </button>
      </div>
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

/**
 * Revalidate, or, with a reason, a disabled Revalidate that says why. It uses
 * `aria-disabled` rather than `disabled`, so it stays focusable and shows its
 * tooltip: disabled buttons don't get hover or focus in every browser.
 */
function RevalidateButton({
  reason,
  onClick
}: {
  reason: string | undefined;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      aria-disabled={reason !== undefined || undefined}
      title={reason}
      onClick={reason === undefined ? onClick : undefined}
    >
      Revalidate
    </button>
  );
}
