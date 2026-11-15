import { resolveMock } from '@swr-devtools-react/playground-shared/mock-routes';

// Every request is answered fresh, never from a build-time cache.
export const dynamic = 'force-dynamic';

/** Serves the shared mock API, as the Vite playground's dev-server plugin does. */
export async function GET(request: Request): Promise<Response> {
  const mock = resolveMock(new URL(request.url));
  if (!mock) return Response.json({ error: 'Not found' }, { status: 404 });
  const { status = 200, delay = 0, body } = mock;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  return Response.json(body, { status });
}
