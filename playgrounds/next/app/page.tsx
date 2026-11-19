import { App } from './client-app.tsx';
import { Nav } from './nav.tsx';

export default function Page() {
  return <App nav={<Nav current="app" />} />;
}
