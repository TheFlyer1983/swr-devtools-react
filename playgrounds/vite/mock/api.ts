import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/**
 * A tiny mock API served by the Vite dev server, so the playground makes
 * real HTTP requests (visible in the browser's Network tab) without a backend.
 */

type Handler = (url: URL) => { status?: number; delay?: number; body: unknown };

const SLOW_DELAY_MS = 2000;
const FEED_PAGE_SIZE = 5;
const FEED_PAGES = 4;

const routes: Record<string, Handler> = {
  // Fast success
  '/api/user': () => ({
    body: { id: 1, name: 'Ada Lovelace', role: 'admin' }
  }),

  // Slow success, so loading and validating states stay visible
  '/api/slow': () => ({
    delay: SLOW_DELAY_MS,
    body: { message: `Answered after ${SLOW_DELAY_MS}ms`, servedAt: new Date().toISOString() }
  }),

  // Always fails
  '/api/error': () => ({
    status: 500,
    body: { error: 'Something went wrong on the server' }
  }),

  // Paginated list, requested with an array key: ['/api/posts', page]
  '/api/posts': (url) => {
    const page = Number(url.searchParams.get('page') ?? 1);
    return {
      delay: 300,
      body: {
        page,
        posts: Array.from({ length: 3 }, (_, i) => {
          const id = (page - 1) * 3 + i + 1;
          return { id, title: `Post ${id}` };
        })
      }
    };
  },

  // Search, requested with an object key: { url: '/api/search', q }
  '/api/search': (url) => {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const fruits = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'grape', 'mango', 'peach'];
    return { delay: 200, body: { q, results: fruits.filter((f) => f.includes(q)) } };
  },

  // Pages for useSWRInfinite
  '/api/feed': (url) => {
    const page = Number(url.searchParams.get('page') ?? 1);
    const items =
      page > FEED_PAGES
        ? []
        : Array.from({ length: FEED_PAGE_SIZE }, (_, i) => {
            const id = (page - 1) * FEED_PAGE_SIZE + i + 1;
            return { id, text: `Feed item ${id}` };
          });
    return { delay: 400, body: { page, items, hasMore: page < FEED_PAGES } };
  }
};

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function handleMockRequest(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const handler = routes[url.pathname];
  if (!handler) {
    if (url.pathname.startsWith('/api/')) {
      send(res, 404, { error: `No mock for ${url.pathname}` });
      return;
    }
    next();
    return;
  }
  const { status = 200, delay = 0, body } = handler(url);
  setTimeout(() => send(res, status, body), delay);
}

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
