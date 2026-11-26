import { fetcher } from '@swr-devtools-react/playground-shared/fetcher';
import { useState, type ReactNode } from 'react';
import { SWRConfig, type Cache } from 'swr';
// The docs site is a production build, where the main entry renders nothing.
import { SWRDevtoolsPanel } from 'swr-devtools-react/production';
import './demo.css';
import { installMockFetch } from './mock-fetch.ts';

/**
 * A list of requests above an inline panel showing their cache. Each frame
 * gets its own cache, so the panel only shows the keys its requests use.
 */
export function DemoFrame({ children }: { children: ReactNode }) {
  installMockFetch();
  const [cache] = useState<Cache>(() => new Map());
  return (
    <SWRConfig value={{ fetcher, provider: () => cache }}>
      <div className="swr-demo not-content">
        <ul className="swr-demo__requests">{children}</ul>
        <div className="swr-demo__panel">
          <SWRDevtoolsPanel />
        </div>
      </div>
    </SWRConfig>
  );
}
