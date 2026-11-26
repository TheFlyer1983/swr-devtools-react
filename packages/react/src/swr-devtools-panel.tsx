import type { ReactElement } from 'react';
import { Panel, useCacheView } from './panel.tsx';
import { ShadowHost, type Theme } from './shadow-host.tsx';

export interface SWRDevtoolsPanelProps {
  /** Light or dark colours. Defaults to `system`, which follows the OS or browser setting. */
  theme?: Theme;
}

/**
 * The devtools panel on its own, with no floating button. It fills the
 * element you render it in, so give that element a size. Place it inside the
 * app's `<SWRConfig>`.
 *
 * For embedding in your own layout or another devtools host.
 */
export function SWRDevtoolsPanel({ theme }: SWRDevtoolsPanelProps = {}): ReactElement | null {
  return (
    <ShadowHost inline theme={theme}>
      <InlinePanel />
    </ShadowHost>
  );
}

function InlinePanel(): ReactElement {
  return <Panel view={useCacheView()} />;
}
