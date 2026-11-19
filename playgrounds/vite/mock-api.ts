import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveMock } from '@swr-devtools-react/playground-shared/mock-routes';
import type { Plugin } from 'vite';

function handleMockRequest(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const mock = resolveMock(new URL(req.url ?? '/', 'http://localhost'));
  if (!mock) {
    next();
    return;
  }
  const { status = 200, delay = 0, body } = mock;
  setTimeout(() => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }, delay);
}

/** Serves the shared mock API from the Vite dev and preview servers. */
export function mockApi(): Plugin {
  return {
    name: 'playground-mock-api',
    // `vite` (dev server)
    configureServer(server) {
      server.middlewares.use(handleMockRequest);
    },
    // `vite preview` (serves the production build)
    configurePreviewServer(server) {
      server.middlewares.use(handleMockRequest);
    }
  };
}
