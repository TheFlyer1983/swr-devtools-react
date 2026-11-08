import type { ReactElement } from 'react';

export interface SWRDevtoolsProps {
  /** Start with the panel open. */
  initialIsOpen?: boolean;
}

/**
 * Placeholder until the panel shell lands (#11).
 */
export function SWRDevtools({ initialIsOpen = false }: SWRDevtoolsProps): ReactElement {
  return (
    <div data-swr-devtools="" data-open={initialIsOpen}>
      SWR Devtools
    </div>
  );
}
