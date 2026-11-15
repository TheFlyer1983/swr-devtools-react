import { useState, type ReactNode } from 'react';
import { aggressiveReset } from './aggressive-reset.ts';
import { scenarios } from './scenarios/index.ts';

interface AppProps {
  /** Links shown under the title, e.g. between a playground's pages. */
  nav?: ReactNode;
}

/**
 * The playground page: scenario toggles and cards. Each playground renders
 * `<SWRDevtools />` itself, where a real app would.
 */
export function App({ nav }: AppProps) {
  const [reset, setReset] = useState(false);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set(scenarios.map((s) => s.id)));

  const toggle = (id: string) =>
    setMounted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="app">
      <header className="app__header">
        <h1>SWR Devtools playground</h1>
        {nav}
        <p>
          Mount scenarios to add their keys to the SWR cache. SWR keeps keys after a scenario
          unmounts. Each card shows its SWR key and live status.
        </p>
        <label>
          <input type="checkbox" checked={reset} onChange={() => setReset(!reset)} />
          Apply an aggressive global CSS reset (the devtools should be unaffected)
        </label>
        {reset && <style>{aggressiveReset}</style>}
      </header>

      <fieldset className="toggles">
        <legend>Mounted scenarios</legend>
        {scenarios.map((s) => (
          <label key={s.id}>
            <input type="checkbox" checked={mounted.has(s.id)} onChange={() => toggle(s.id)} />
            {s.label}
          </label>
        ))}
        <span className="toggles__all">
          <button onClick={() => setMounted(new Set(scenarios.map((s) => s.id)))}>Mount all</button>
          <button onClick={() => setMounted(new Set())}>Unmount all</button>
        </span>
      </fieldset>

      <main className="grid">
        {scenarios
          .filter((s) => mounted.has(s.id))
          .map(({ id, Component }) => (
            <Component key={id} />
          ))}
      </main>
    </div>
  );
}
