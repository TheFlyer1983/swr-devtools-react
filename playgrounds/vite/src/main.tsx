import { Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { App } from './App.tsx';
import { fetcher } from './fetcher.ts';
import { SpikeLab } from './spike/SpikeLab.tsx';
import { createObservableCache } from './spike/a-wrapped-provider.ts';
import { mountTracker } from './spike/d-middleware.ts';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// SPIKE (#5): http://localhost:5173/?spike (optionally &poll=250, &strict=0) enables the
// prototypes. Without ?spike the playground is unchanged.
const params = new URLSearchParams(location.search);
const spike = params.has('spike');
const pollMs = Number(params.get('poll') ?? 250);
const strict = params.get('strict') !== '0';
const Root = strict ? StrictMode : Fragment;
// &provider=map uses SWR's documented `() => new Map()` to rule out our wrapper.
// &bare strips the lab panel and middleware, leaving only the provider.
const bare = params.has('bare');
// &provider=none uses SWR's default cache (no provider), as most apps do.
const providerParam = params.get('provider');
const provider =
  providerParam === 'map'
    ? () => new Map()
    : providerParam === 'none'
      ? undefined
      : createObservableCache;

createRoot(root).render(
  <Root>
    {spike ? (
      <SWRConfig
        value={{ fetcher, use: bare ? [] : [mountTracker], ...(provider ? { provider } : {}) }}
      >
        <App />
        {bare ? null : <SpikeLab pollMs={pollMs} />}
      </SWRConfig>
    ) : (
      <SWRConfig value={{ fetcher }}>
        <App />
      </SWRConfig>
    )}
  </Root>
);
