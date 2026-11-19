import { describe, expect, it } from 'vitest';
import { getChildren, inspectValue } from './inspect-value.ts';

describe('inspectValue', () => {
  it('previews leaves as they would be written', () => {
    expect(inspectValue('Ada')).toEqual({ kind: 'string', preview: '"Ada"' });
    expect(inspectValue(42)).toEqual({ kind: 'number', preview: '42' });
    expect(inspectValue(10n)).toEqual({ kind: 'bigint', preview: '10n' });
    expect(inspectValue(false)).toEqual({ kind: 'boolean', preview: 'false' });
    expect(inspectValue(null)).toEqual({ kind: 'null', preview: 'null' });
    expect(inspectValue(undefined)).toEqual({ kind: 'undefined', preview: 'undefined' });
    expect(inspectValue(Symbol('id'))).toEqual({ kind: 'symbol', preview: 'Symbol(id)' });
    expect(inspectValue(function load() {})).toEqual({ kind: 'function', preview: 'ƒ load()' });
  });

  it('shows dates as ISO strings, not empty objects', () => {
    expect(inspectValue(new Date(0))).toEqual({
      kind: 'date',
      preview: '1970-01-01T00:00:00.000Z'
    });
    expect(inspectValue(new Date(Number.NaN)).preview).toBe('Invalid Date');
  });

  it('summarises containers by size', () => {
    expect(inspectValue([1, 2, 3])).toEqual({ kind: 'array', preview: 'Array(3)', size: 3 });
    expect(inspectValue({ a: 1, b: 2 })).toEqual({ kind: 'object', preview: 'Object(2)', size: 2 });
    expect(inspectValue(new Map([['a', 1]]))).toEqual({ kind: 'map', preview: 'Map(1)', size: 1 });
    expect(inspectValue(new Set([1, 2]))).toEqual({ kind: 'set', preview: 'Set(2)', size: 2 });
  });

  it('names class instances and null-prototype objects', () => {
    class User {
      name = 'Ada';
    }

    expect(inspectValue(new User()).preview).toBe('User(1)');
    expect(inspectValue(Object.create(null)).preview).toBe('Object(0)');
  });

  it('previews an error by its name and message', () => {
    const error = Object.assign(new TypeError('boom'), { status: 500 });

    expect(inspectValue(error)).toEqual({ kind: 'error', preview: 'TypeError: boom', size: 2 });
  });
});

describe('getChildren', () => {
  it('lists array items by index', () => {
    expect(getChildren(['a', 'b'])).toEqual([
      { name: '0', value: 'a' },
      { name: '1', value: 'b' }
    ]);
  });

  it('lists object properties in order', () => {
    expect(getChildren({ b: 1, a: 2 })).toEqual([
      { name: 'b', value: 1 },
      { name: 'a', value: 2 }
    ]);
  });

  it('lists map entries by their key and set items by position', () => {
    expect(
      getChildren(
        new Map<unknown, number>([
          ['a', 1],
          [2, 2]
        ])
      )
    ).toEqual([
      { name: '"a"', value: 1 },
      { name: '2', value: 2 }
    ]);
    expect(getChildren(new Set(['x']))).toEqual([{ name: '0', value: 'x' }]);
  });

  it('reads a slice, numbering items from where it starts', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);

    expect(getChildren(items, 500, 502)).toEqual([
      { name: '500', value: 500 },
      { name: '501', value: 501 }
    ]);
  });

  it("lists an error's message, its own fields and its cause", () => {
    const cause = new Error('network');
    const error = Object.assign(new Error('Request failed', { cause }), {
      status: 500,
      info: { reason: 'down' }
    });

    expect(getChildren(error)).toEqual([
      { name: 'message', value: 'Request failed' },
      { name: 'status', value: 500 },
      { name: 'info', value: { reason: 'down' } },
      { name: 'cause', value: cause }
    ]);
  });

  it("counts an error's fields without running their getters", () => {
    const error = new Error('boom');
    let reads = 0;
    Object.defineProperty(error, 'info', {
      enumerable: true,
      get: () => {
        reads += 1;
        return 'detail';
      }
    });

    expect(inspectValue(error).size).toBe(2);
    expect(reads).toBe(0);
  });

  it('runs no getters outside the requested slice', () => {
    const read: string[] = [];
    const value = {};
    for (const name of ['a', 'b', 'c']) {
      Object.defineProperty(value, name, {
        enumerable: true,
        get: () => {
          read.push(name);
          return name;
        }
      });
    }

    expect(getChildren(value, 1, 2)).toEqual([{ name: 'b', value: 'b' }]);
    expect(read).toEqual(['b']);
  });

  it('shows a getter that throws as a value, not an exception', () => {
    const value = {
      get broken(): never {
        throw new TypeError('nope');
      }
    };

    const [child] = getChildren(value);

    expect(child?.name).toBe('broken');
    expect(inspectValue(child?.value)).toEqual({
      kind: 'thrown',
      preview: '[Threw: TypeError: nope]'
    });
  });

  it('stops iterating a map or set at the end of the slice', () => {
    const seen: number[] = [];
    const set = new Set<number>();
    // Stands in for a huge set, recording how far it's iterated.
    Object.defineProperty(set, Symbol.iterator, { value: () => countTo(1000, seen) });

    expect(getChildren(set, 2, 4)).toEqual([
      { name: '2', value: 2 },
      { name: '3', value: 3 }
    ]);
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('gives leaves no children', () => {
    expect(getChildren('text')).toEqual([]);
    expect(getChildren(null)).toEqual([]);
    expect(getChildren(new Date())).toEqual([]);
  });
});

function* countTo(limit: number, seen: number[]): Generator<number> {
  for (let i = 0; i < limit; i += 1) {
    seen.push(i);
    yield i;
  }
}
