import type { PlaygroundKey } from '@swr-devtools-react/playground-shared/fetcher';
import { useState, type ReactNode } from 'react';
import useSWR from 'swr';

type Status = 'loading' | 'validating' | 'success' | 'error' | 'idle';

interface SWRState {
  data: unknown;
  error: unknown;
  isValidating: boolean;
}

function statusOf({ data, error, isValidating }: SWRState): Status {
  if (error) return 'error';
  if (data === undefined) return isValidating ? 'loading' : 'idle';
  if (isValidating) return 'validating';
  return 'success';
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`swr-demo__status swr-demo__status--${status}`}>{status}</span>;
}

interface RequestProps<Data> {
  label: string;
  swrKey: PlaygroundKey;
  /** Shows a Revalidate button that calls the hook's `mutate()`. */
  revalidateButton?: boolean;
  /** Renders the hook's data under the row, or "No data" once it's gone. */
  children?: (data: Data) => ReactNode;
}

export function Request<Data>({
  label,
  swrKey,
  revalidateButton = true,
  children
}: RequestProps<Data>) {
  const swr = useSWR<Data>(swrKey);
  const status = statusOf(swr);
  return (
    <li className="swr-demo__request">
      <code>{label}</code>
      <StatusBadge status={status} />
      {revalidateButton && (
        <button type="button" onClick={() => void swr.mutate()}>
          Revalidate
        </button>
      )}
      {children && (swr.data !== undefined || status === 'idle') && (
        <div className="swr-demo__data">
          {swr.data === undefined ? <em>No data</em> : children(swr.data)}
        </div>
      )}
    </li>
  );
}

export function PostsRequest() {
  const [page, setPage] = useState(1);
  const swr = useSWR<{ totalPages: number }>(['/api/posts', page]);
  // Until the current page loads, its totalPages is unknown, so Next waits for it.
  const canGoNext = swr.data !== undefined && page < swr.data.totalPages;
  return (
    <li className="swr-demo__request">
      <code>['/api/posts', {page}]</code>
      <StatusBadge status={statusOf(swr)} />
      <span className="swr-demo__pager">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <button type="button" disabled={!canGoNext} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </span>
    </li>
  );
}
