/**
 * One fetcher for every key shape the playground uses:
 * - string:  '/api/user'
 * - array:   ['/api/posts', 2]          -> /api/posts?page=2
 * - object:  { url: '/api/search', q }  -> /api/search?q=...
 */
export type PlaygroundKey =
  | string
  | readonly [url: string, page: number]
  | { url: string; [param: string]: string | number };

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly info: unknown
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

function isPageKey(key: PlaygroundKey): key is readonly [url: string, page: number] {
  return Array.isArray(key);
}

function toUrl(key: PlaygroundKey): string {
  if (typeof key === 'string') return key;
  if (isPageKey(key)) {
    const [url, page] = key;
    return `${url}?page=${page}`;
  }
  const { url, ...params } = key;
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return query ? `${url}?${query}` : url;
}

/**
 * Set once on <SWRConfig>. Each hook declares its own data type,
 * e.g. useSWR<User>('/api/user'), so this returns `unknown`.
 */
export async function fetcher(key: PlaygroundKey): Promise<unknown> {
  const url = toUrl(key);
  const res = await fetch(url);
  if (!res.ok) {
    // Error bodies aren't always JSON (e.g. an HTML error page from a proxy),
    // so never let a parse failure hide the HTTP status.
    const info = await res.text().then(parseJsonOrText);
    throw new FetchError(`Request failed with ${res.status}`, res.status, info);
  }
  // Vite answers unknown paths with 200 + index.html, so a mistyped URL
  // "succeeds". Say so plainly instead of failing with a JSON SyntaxError.
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new FetchError(
      `Expected JSON from ${url}, got ${type || 'no content type'}`,
      res.status,
      await res.text()
    );
  }
  const body: unknown = await res.json();
  return body;
}

function parseJsonOrText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
