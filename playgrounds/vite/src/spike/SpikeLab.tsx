import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSWRConfig } from 'swr';
import type { Approach } from './log.ts';
import { clearEvents, getEvents, subscribe } from './log.ts';
import { usePollingObserver } from './b-polling.ts';
import { patchInternals } from './c-internals.ts';
import { usePatchedCacheObserver } from './e-patch-instance.ts';

const APPROACHES: Approach[] = [
  'A: wrapped provider',
  'B: polling',
  'C: internals',
  'D: middleware',
  'E: patch instance'
];

/** SPIKE (#5), throwaway: shows what each approach observed. */
export function SpikeLab({ pollMs }: { pollMs: number }) {
  const { cache, mutate } = useSWRConfig();
  const events = useSyncExternalStore(subscribe, () => getEvents().length);
  const [patched, setPatched] = useState(false);

  usePollingObserver(pollMs);
  usePatchedCacheObserver();
  useEffect(() => {
    if (!patched) setPatched(patchInternals(cache));
  }, [cache, patched]);

  const all = getEvents();
  const recent = all.slice(-12).reverse();

  return (
    <aside className="spike">
      <strong>Spike #5: cache observation</strong> (poll every {pollMs}ms, internals patched:{' '}
      {String(patched)}, {events} events)
      <table>
        <tbody>
          {APPROACHES.map((a) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{all.filter((e) => e.approach === a).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={clearEvents}>Clear log</button>{' '}
      <button
        onClick={() => {
          for (let i = 0; i < 1000; i++) void mutate(`/bench/${i}`, { i }, { revalidate: false });
        }}
      >
        Add 1000 keys
      </button>
      <ol reversed>
        {recent.map((e, i) => (
          <li key={i}>
            {e.t}ms · {e.approach.slice(0, 1)} · {e.kind} · <code>{e.key}</code> {e.summary ?? ''}
          </li>
        ))}
      </ol>
    </aside>
  );
}
