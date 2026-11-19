import '@swr-devtools-react/playground-shared/styles.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SWRDevtools } from 'swr-devtools-react';
import { Providers } from './providers.tsx';

export const metadata: Metadata = { title: 'SWR Devtools playground (Next.js)' };

/**
 * A server component. Rendering `<SWRDevtools />` here, not in a client
 * component, checks that the package's 'use client' banner works.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <SWRDevtools />
        </Providers>
      </body>
    </html>
  );
}
