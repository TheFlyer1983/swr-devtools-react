/** Links between the App Router and Pages Router pages. */
export function Nav({ current }: { current: 'app' | 'pages' }) {
  // Plain links: moving between the two routers is a full page load anyway.
  return (
    <p>
      {current === 'app' ? <strong>App Router</strong> : <a href="/">App Router</a>}
      {' · '}
      {current === 'pages' ? (
        <strong>Pages Router</strong>
      ) : (
        <a href="/pages-router">Pages Router</a>
      )}
    </p>
  );
}
