/**
 * SPIKE (#5), throwaway. A shared log that each prototype writes to, so the
 * approaches can be compared on the same run of the playground.
 */
export type Approach =
  | 'A: wrapped provider'
  | 'B: polling'
  | 'C: internals'
  | 'D: middleware'
  | 'E: patch instance';

export interface SpikeEvent {
  approach: Approach;
  /** ms since page load */
  t: number;
  kind: 'set' | 'delete' | 'mount' | 'unmount' | 'poll-diff';
  key: string;
  /** Short summary of the entry after the change */
  summary?: string;
}

const events: SpikeEvent[] = [];
const listeners = new Set<() => void>();

export function record(event: Omit<SpikeEvent, 't'>): void {
  events.push({ ...event, t: Math.round(performance.now()) });
  for (const listener of listeners) listener();
}

export function getEvents(): readonly SpikeEvent[] {
  return events;
}

export function clearEvents(): void {
  events.length = 0;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function summarize(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value);
  const v = value as {
    data?: unknown;
    error?: unknown;
    isLoading?: boolean;
    isValidating?: boolean;
  };
  const flags = [
    v.isLoading ? 'loading' : '',
    v.isValidating ? 'validating' : '',
    v.error ? 'error' : '',
    v.data !== undefined ? 'data' : ''
  ].filter(Boolean);
  return flags.join('+') || 'empty';
}

// Expose for measuring from the browser console / automation.
declare global {
  interface Window {
    __spike?: { getEvents: typeof getEvents; clearEvents: typeof clearEvents };
  }
}
window.__spike = { getEvents, clearEvents };
