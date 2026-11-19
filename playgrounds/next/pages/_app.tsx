// The Pages Router only allows global CSS here.
import '@swr-devtools-react/playground-shared/styles.css';
import type { AppProps } from 'next/app';

export default function PagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
