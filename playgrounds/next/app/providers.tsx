'use client';

import { fetcher } from '@swr-devtools-react/playground-shared/fetcher';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';

/**
 * A function like the fetcher can't be passed from a server component, so
 * `<SWRConfig>` with one lives in a client component, as in a real app.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
}
