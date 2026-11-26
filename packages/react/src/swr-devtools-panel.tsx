import type { ReactElement } from 'react';
import { Panel, useCacheView } from './panel.tsx';
import { ShadowHost } from './shadow-host.tsx';
import type { Theme } from './storage.ts';
import { ThemeScope, useThemeChoice } from './theme.tsx';

export interface SWRDevtoolsPanelProps {
  /**
   * Light or dark colours, for a host such as TanStack Devtools that manages
   * the theme itself. When it's set, the panel hides its own theme picker.
   * Without it, the user picks, starting from `system`, which follows the OS
   * or browser setting.
   */
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
    <ShadowHost inline>
      <InlinePanel theme={theme} />
    </ShadowHost>
  );
}

function InlinePanel(props: SWRDevtoolsPanelProps): ReactElement {
  const { theme, onThemeChange } = useThemeChoice(props.theme);
  const view = useCacheView();
  return (
    <ThemeScope theme={theme}>
      <Panel view={view} theme={theme} onThemeChange={onThemeChange} />
    </ThemeScope>
  );
}
