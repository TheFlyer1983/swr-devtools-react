/**
 * The playgrounds' mock API, shared by Vite (a dev-server plugin) and Next.js
 * (a route handler). The app makes real HTTP requests, visible in the
 * browser's Network tab, without a backend.
 */

/** A mock answer: the HTTP status (200 if left out), a delay in ms, and a JSON body. */
export interface MockResponse {
  status?: number;
  delay?: number;
  body: unknown;
}

type Handler = (url: URL) => MockResponse;

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

/**
 * The mock answer for a request URL, a 404 for an unknown `/api/` path, or
 * `undefined` for anything else, so the dev server can serve it as usual.
 */
export function resolveMock(url: URL): MockResponse | undefined {
  const handler = routes[url.pathname];
  if (handler) return handler(url);
  if (url.pathname.startsWith('/api/')) {
    return { status: 404, body: { error: `No mock for ${url.pathname}` } };
  }
  return undefined;
}
