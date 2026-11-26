import type { ReactElement } from 'react';
import * as devtools from './production.ts';

export type { ButtonPosition, SWRDevtoolsProps } from './swr-devtools.tsx';
export type { SWRDevtoolsPanelProps } from './swr-devtools-panel.tsx';
export type { Theme } from './shadow-host.tsx';
export type { PanelPosition } from './storage.ts';

// Bundlers replace `process.env.NODE_ENV` at build time, so in a production
// build the real components become unreachable and are tree-shaken out. Import
// from `swr-devtools-react/production` to keep them (e.g. on staging).
const isProduction = process.env.NODE_ENV === 'production';

/**
 * A floating button that opens the devtools panel. Renders nothing when
 * `NODE_ENV` is `production`; import from `swr-devtools-react/production` to
 * force it on.
 */
export const SWRDevtools: typeof devtools.SWRDevtools = isProduction
  ? (): ReactElement | null => null
  : devtools.SWRDevtools;

/**
 * The devtools panel on its own, with no floating button. Renders nothing when
 * `NODE_ENV` is `production`; import from `swr-devtools-react/production` to
 * force it on.
 */
export const SWRDevtoolsPanel: typeof devtools.SWRDevtoolsPanel = isProduction
  ? (): ReactElement | null => null
  : devtools.SWRDevtoolsPanel;
