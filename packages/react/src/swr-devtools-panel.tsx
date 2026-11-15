import type { ReactElement } from 'react';
import { Panel, useCacheView } from './panel.tsx';
import { ShadowHost } from './shadow-host.tsx';

/**
 * The devtools panel on its own, with no floating button. It fills the
 * element you render it in, so give that element a size. Place it inside the
 * app's `<SWRConfig>`.
 *
 * For embedding in your own layout or another devtools host.
 */
export function SWRDevtoolsPanel(): ReactElement | null {
  return (
    <ShadowHost inline>
      <InlinePanel />
    </ShadowHost>
  );
}

function InlinePanel(): ReactElement {
  return <Panel view={useCacheView()} />;
}
