import { fetcher, type PlaygroundKey } from '@swr-devtools-react/playground-shared/fetcher';
import { useState } from 'react';
import useSWR, { SWRConfig, type Cache } from 'swr';
// The docs site is a production build, where the main entry renders nothing.
import { SWRDevtoolsPanel } from 'swr-devtools-react/production';
import './demo.css';
import { installMockFetch } from './mock-fetch.ts';

type Status = 'loading' | 'validating' | 'success' | 'error';

interface SWRState {
  data: unknown;
  error: unknown;
  isValidating: boolean;
}

function statusOf({ data, error, isValidating }: SWRState): Status {
  if (error) return 'error';
  if (data === undefined) return 'loading';
  if (isValidating) return 'validating';
  return 'success';
}

function useRequest(key: PlaygroundKey) {
  const swr = useSWR(key);
  return { status: statusOf(swr), revalidate: () => void swr.mutate() };
}

function Request({ label, swrKey }: { label: string; swrKey: PlaygroundKey }) {
  const { status, revalidate } = useRequest(swrKey);
  return (
    <li className="swr-demo__request">
      <code>{label}</code>
      <span className={`swr-demo__status swr-demo__status--${status}`}>{status}</span>
      <button type="button" onClick={revalidate}>
        Revalidate
      </button>
    </li>
  );
}

function PostsRequest() {
  const [page, setPage] = useState(1);
  const swr = useSWR<{ totalPages: number }>(['/api/posts', page]);
  const status = statusOf(swr);
  // Until the current page loads, its totalPages is unknown, so Next waits for it.
  const canGoNext = swr.data !== undefined && page < swr.data.totalPages;
  return (
    <li className="swr-demo__request">
      <code>['/api/posts', {page}]</code>
      <span className={`swr-demo__status swr-demo__status--${status}`}>{status}</span>
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

/**
 * A few requests and an inline panel showing their cache. Each demo gets its
 * own cache, so demos on the same page don't show each other's keys.
 */
export function DevtoolsDemo() {
  installMockFetch();
  const [cache] = useState<Cache>(() => new Map());
  return (
    <SWRConfig value={{ fetcher, provider: () => cache }}>
      <div className="swr-demo not-content">
        <ul className="swr-demo__requests">
          <Request label="'/api/users/1'" swrKey="/api/users/1" />
          <PostsRequest />
          <Request label="'/api/slow'" swrKey="/api/slow" />
          <Request label="'/api/error'" swrKey="/api/error" />
        </ul>
        <div className="swr-demo__panel">
          <SWRDevtoolsPanel />
        </div>
      </div>
    </SWRConfig>
  );
}
