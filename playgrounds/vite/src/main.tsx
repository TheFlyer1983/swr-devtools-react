import { App } from '@swr-devtools-react/playground-shared/app';
import { fetcher } from '@swr-devtools-react/playground-shared/fetcher';
import '@swr-devtools-react/playground-shared/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { SWRDevtools } from 'swr-devtools-react';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <SWRConfig value={{ fetcher }}>
      <App />
      <SWRDevtools />
    </SWRConfig>
  </StrictMode>
);
