import { useState } from 'react';
import { SWRDevtools } from 'swr-devtools-react';
import { scenarios } from './scenarios/index.ts';

export function App() {
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
        <p>
          Mount and unmount scenarios to make cache keys appear and disappear. Each card shows its
          SWR key and live status.
        </p>
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

      <SWRDevtools />
    </div>
  );
}
