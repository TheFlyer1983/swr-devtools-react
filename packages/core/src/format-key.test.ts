import { unstable_serialize as serialize } from 'swr';
import { describe, expect, it } from 'vitest';
import { formatKey } from './format-key.ts';

describe('formatKey', () => {
  it('leaves string keys as they are', () => {
    expect(formatKey('/api/user')).toBe('/api/user');
  });

  it('formats array keys', () => {
    expect(formatKey(serialize(['/api/posts', 2]))).toBe('["/api/posts", 2]');
  });

  it('formats object keys with properties in alphabetical order', () => {
    expect(formatKey(serialize({ url: '/api/search', q: 'ap' }))).toBe(
      '{ q: "ap", url: "/api/search" }'
    );
  });

  it('formats nested arrays and objects', () => {
    expect(formatKey(serialize(['/api/items', { page: 1, tags: ['a', 'b'] }, [true, null]]))).toBe(
      '["/api/items", { page: 1, tags: ["a", "b"] }, [true, null]]'
    );
  });

  it('formats empty arrays and objects inside a key', () => {
    expect(formatKey(serialize(['/api/x', [], {}]))).toBe('["/api/x", [], {}]');
  });

  it('keeps commas, colons and quotes inside strings', () => {
    expect(formatKey(serialize(['a,b', 'c:d', 'say "hi"']))).toBe('["a,b", "c:d", "say \\"hi\\""]');
  });

  it('shows dates as their ISO string', () => {
    expect(formatKey(serialize(['/api/day', new Date('2026-11-12T00:00:00.000Z')]))).toBe(
      '["/api/day", 2026-11-12T00:00:00.000Z]'
    );
  });

  it('strips the infinite and subscription prefixes', () => {
    expect(formatKey(`$inf$${serialize(['/api/feed', 1])}`)).toBe('["/api/feed", 1]');
    expect(formatKey('$sub$ticker')).toBe('ticker');
  });

  it('falls back to the raw key when it is not a serialised array or object', () => {
    expect(formatKey('#not-an-object')).toBe('#not-an-object');
    expect(formatKey('@"unterminated')).toBe('@"unterminated');
  });
});
