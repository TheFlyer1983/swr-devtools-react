/**
 * The playgrounds' mock API, shared by Vite (a dev-server plugin), Next.js
 * (a route handler) and the docs demos (a `fetch` patch). The app makes real
 * HTTP requests, visible in the browser's Network tab, without a backend.
 * The data is in `fixtures/`.
 */
import { comments, posts, todos, users, type Post } from './fixtures/index.ts';

/** A mock answer: the HTTP status (200 if left out), a delay in ms, and a JSON body. */
export interface MockResponse {
  status?: number;
  delay?: number;
  body: unknown;
}

/** Gets the URL and the pattern's capture groups, e.g. the id in `/api/posts/:id`. */
type Handler = (url: URL, params: string[]) => MockResponse;

const SLOW_DELAY_MS = 2000;
const POSTS_PAGE_SIZE = 5;
const FEED_PAGE_SIZE = 5;
const FEED_PAGES = 4;
const SEARCH_LIMIT = 5;

/** The newest posts first, for the feed. */
const newestPosts = posts.toReversed();

function notFound(what: string): MockResponse {
  return { status: 404, body: { error: `${what} not found` } };
}

/** The `page` query parameter, or 1 if it's missing or not a positive integer. */
function pageParam(url: URL): number {
  const page = Number(url.searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function postById(id: string | undefined): Post | undefined {
  return posts.find((post) => post.id === Number(id));
}

const routes: [pattern: RegExp, handler: Handler][] = [
  [/^\/api\/users$/, () => ({ body: users })],

  // Fast success: user 1 is the large, deeply nested object for the detail view.
  [
    /^\/api\/users\/(\d+)$/,
    (_url, [id]) => {
      const user = users.find((u) => u.id === Number(id));
      return user ? { body: user } : notFound(`User ${id}`);
    }
  ],

  // Slow success, so loading and validating states stay visible
  [
    /^\/api\/slow$/,
    () => ({
      delay: SLOW_DELAY_MS,
      body: { message: `Answered after ${SLOW_DELAY_MS}ms`, servedAt: new Date().toISOString() }
    })
  ],

  // Always fails
  [
    /^\/api\/error$/,
    () => ({ status: 500, body: { error: 'Something went wrong on the server' } })
  ],

  // Paginated list, requested with an array key: ['/api/posts', page]
  [
    /^\/api\/posts$/,
    (url) => {
      const page = pageParam(url);
      const start = (page - 1) * POSTS_PAGE_SIZE;
      return {
        delay: 300,
        body: {
          page,
          pageSize: POSTS_PAGE_SIZE,
          total: posts.length,
          totalPages: Math.ceil(posts.length / POSTS_PAGE_SIZE),
          posts: posts.slice(start, start + POSTS_PAGE_SIZE)
        }
      };
    }
  ],

  [
    /^\/api\/posts\/(\d+)$/,
    (_url, [id]) => {
      const post = postById(id);
      return post ? { delay: 150, body: post } : notFound(`Post ${id}`);
    }
  ],

  [
    /^\/api\/posts\/(\d+)\/comments$/,
    (_url, [id]) => {
      const post = postById(id);
      if (!post) return notFound(`Post ${id}`);
      return { delay: 200, body: comments.filter((c) => c.postId === post.id) };
    }
  ],

  // Filtered with ?userId= and ?completed=true|false
  [
    /^\/api\/todos$/,
    (url) => {
      const userId = url.searchParams.get('userId');
      const completed = url.searchParams.get('completed');
      return {
        delay: 150,
        body: todos.filter(
          (todo) =>
            (userId === null || todo.userId === Number(userId)) &&
            (completed === null || String(todo.completed) === completed)
        )
      };
    }
  ],

  // Search, requested with an object key: { url: '/api/search', q }
  [
    /^\/api\/search$/,
    (url) => {
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const matchingUsers = users.filter((user) =>
        [user.name, user.username, user.email, user.company.name].some((field) =>
          field.toLowerCase().includes(q)
        )
      );
      const matchingPosts = posts.filter((post) => post.title.toLowerCase().includes(q));
      return {
        delay: 200,
        body: {
          q,
          total: { users: matchingUsers.length, posts: matchingPosts.length },
          users: matchingUsers
            .slice(0, SEARCH_LIMIT)
            .map(({ id, name, username }) => ({ id, name, username })),
          posts: matchingPosts
            .slice(0, SEARCH_LIMIT)
            .map(({ id, userId, title }) => ({ id, userId, title }))
        }
      };
    }
  ],

  // Pages for useSWRInfinite: the newest posts, with their authors
  [
    /^\/api\/feed$/,
    (url) => {
      const page = pageParam(url);
      const start = (page - 1) * FEED_PAGE_SIZE;
      const items =
        page > FEED_PAGES
          ? []
          : newestPosts.slice(start, start + FEED_PAGE_SIZE).map((post) => {
              const author = users.find((user) => user.id === post.userId);
              return {
                id: post.id,
                title: post.title,
                excerpt: post.body.slice(0, post.body.indexOf('.') + 1),
                author: author ? { id: author.id, name: author.name } : null,
                publishedAt: post.publishedAt,
                commentCount: comments.filter((c) => c.postId === post.id).length
              };
            });
      return { delay: 400, body: { page, items, hasMore: page < FEED_PAGES } };
    }
  ]
];

/**
 * The mock answer for a request URL, a 404 for an unknown `/api/` path, or
 * `undefined` for anything else, so the dev server can serve it as usual.
 */
export function resolveMock(url: URL): MockResponse | undefined {
  for (const [pattern, handler] of routes) {
    const match = pattern.exec(url.pathname);
    if (match) return handler(url, match.slice(1));
  }
  if (url.pathname.startsWith('/api/')) {
    return { status: 404, body: { error: `No mock for ${url.pathname}` } };
  }
  return undefined;
}
