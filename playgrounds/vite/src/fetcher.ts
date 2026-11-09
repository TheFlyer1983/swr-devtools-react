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
  const res = await fetch(toUrl(key));
  const body: unknown = await res.json();
  if (!res.ok) {
    throw new FetchError(`Request failed with ${res.status}`, res.status, body);
  }
  return body;
}
