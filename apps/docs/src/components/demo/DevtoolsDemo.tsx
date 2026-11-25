import { fetcher, type PlaygroundKey } from '@swr-devtools-react/playground-shared/fetcher';
import { useState } from 'react';
import useSWR, { SWRConfig, type Cache } from 'swr';
// The docs site is a production build, where the main entry renders nothing.
import { SWRDevtoolsPanel } from 'swr-devtools-react/production';
import './demo.css';
import { installMockFetch } from './mock-fetch.ts';

type Status = 'loading' | 'validating' | 'success' | 'error';

function useRequest(key: PlaygroundKey) {
  const { data, error, isValidating, mutate } = useSWR(key);
  let status: Status = 'success';
  if (error) status = 'error';
  else if (data === undefined) status = 'loading';
  else if (isValidating) status = 'validating';
  return { status, revalidate: () => void mutate() };
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
  const { status } = useRequest(['/api/posts', page]);
  return (
    <li className="swr-demo__request">
      <code>['/api/posts', {page}]</code>
      <span className={`swr-demo__status swr-demo__status--${status}`}>{status}</span>
      <span className="swr-demo__pager">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <button type="button" onClick={() => setPage(page + 1)}>
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
          <Request label="'/api/user'" swrKey="/api/user" />
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
