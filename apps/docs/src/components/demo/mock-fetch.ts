import { resolveMock } from '@swr-devtools-react/playground-shared/mock-routes';

let installed = false;

/**
 * Answers the playground's `/api/*` requests in the browser, because the
 * static docs site has no server. Other requests go to the real `fetch`.
 */
export function installMockFetch(): void {
  if (installed) return;
  installed = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const mock = url.origin === window.location.origin ? resolveMock(url) : undefined;
    if (!mock) return realFetch(input, init);

    const { status = 200, delay = 0, body } = mock;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}
