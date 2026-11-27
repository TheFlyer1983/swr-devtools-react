/**
 * A seeded random source, so generated fixtures are identical on every run and
 * screenshots and tests stay stable. Each fixture file uses its own seed, so
 * changing one doesn't reshuffle the others.
 */

/** Every generated date is before this, so fixtures don't depend on today's date. */
export const FIXTURE_EPOCH = Date.UTC(2026, 0, 1);

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Space-separated words as an array, so long lists stay compact. */
const list = (text: string) => text.trim().split(/\s+/);

const WORDS = list(`
  cache request stale fresh garden river signal window harbour lantern quiet bright early winter
  summer market bridge meadow copper paper orbit engine pattern letter number story island forest
  mirror thread compass voyage kitchen pocket ladder candle silver harvest station canvas puzzle
  rhythm timber velvet marble beacon circuit glacier horizon journal kettle needle pebble ribbon
  saddle tunnel violet whistle anchor blossom
`);

const FIRST_NAMES = list(`
  Amara Bruno Chen Dara Elif Felix Greta Hugo Ines Jonas Kemi Lars Mira Nico Oona Priya Quinn Rosa
  Sami Tariq
`);

const LAST_NAMES = list(`
  Abara Berg Costa Dubois Eriksen Fischer Garcia Haddad Ito Jensen Kowalski Lindqvist Moreau Novak
  Okafor Petrov Rossi Sato Torres Weber
`);

export interface Random {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  bool(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Up to `max` distinct items, in their original order. */
  some<T>(items: readonly T[], max: number): T[];
  /** Lower-case words joined by spaces. */
  words(min: number, max: number): string;
  sentence(min?: number, max?: number): string;
  paragraph(minSentences: number, maxSentences: number): string;
  /** An ISO date up to `maxDaysBefore` days before `before` (the fixture epoch by default). */
  dateBefore(maxDaysBefore: number, before?: number): string;
  person(): { name: string; email: string };
}

/** mulberry32: small, fast and good enough for demo data. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick() needs at least one item');
    return item;
  };
  const words = (min: number, max: number) =>
    Array.from({ length: int(min, max) }, () => pick(WORDS)).join(' ');
  const sentence = (min = 6, max = 14) => {
    const text = words(min, max);
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  };

  return {
    next,
    int,
    bool: (probability = 0.5) => next() < probability,
    pick,
    some: (items, max) => items.filter(() => next() < max / items.length).slice(0, max),
    words,
    sentence,
    paragraph: (minSentences, maxSentences) =>
      Array.from({ length: int(minSentences, maxSentences) }, () => sentence()).join(' '),
    dateBefore: (maxDaysBefore, before = FIXTURE_EPOCH) =>
      new Date(before - int(0, maxDaysBefore * 24) * HOUR_MS).toISOString(),
    person: () => {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      return { name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase() };
    }
  };
}
