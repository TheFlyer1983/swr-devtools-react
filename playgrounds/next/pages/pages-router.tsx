import { App } from '@swr-devtools-react/playground-shared/app';
import { fetcher } from '@swr-devtools-react/playground-shared/fetcher';
import { SWRConfig } from 'swr';
import { SWRDevtools } from 'swr-devtools-react';
import { Nav } from '../app/nav.tsx';

/** The same scenarios on the Pages Router, which renders on the server, then hydrates. */
export default function PagesRouterPage() {
  return (
    <SWRConfig value={{ fetcher }}>
      <App nav={<Nav current="pages" />} />
      <SWRDevtools />
    </SWRConfig>
  );
}
