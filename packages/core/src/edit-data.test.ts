import { describe, expect, it } from 'vitest';
import { parseEditedData, toEditableData } from './edit-data.ts';

describe('toEditableData', () => {
  it('pretty-prints JSON data with two-space indents', () => {
    expect(toEditableData({ name: 'Ada', tags: [1] })).toEqual({
      editable: true,
      text: '{\n  "name": "Ada",\n  "tags": [\n    1\n  ]\n}',
      exact: true
    });
    expect(toEditableData('Ada')).toEqual({ editable: true, text: '"Ada"', exact: true });
    expect(toEditableData(null)).toEqual({ editable: true, text: 'null', exact: true });
  });

  it('starts empty when the key has no data', () => {
    expect(toEditableData(undefined)).toEqual({ editable: true, text: '', exact: true });
  });

  it('flags data JSON would change', () => {
    for (const data of [
      new Date(0),
      { at: new Date(0) },
      new Map([['a', 1]]),
      { missing: undefined },
      [Number.NaN],
      { load() {} }
    ]) {
      expect(toEditableData(data)).toMatchObject({ editable: true, exact: false });
    }
  });

  it('treats objects without a prototype as plain', () => {
    const data = { __proto__: null, a: 1 };
    expect(toEditableData(data)).toMatchObject({ editable: true, exact: true });
  });

  it('treats data it fails to inspect as inexact, but keeps it editable', () => {
    const data = new Proxy(
      { a: 1 },
      {
        getPrototypeOf() {
          throw new Error('trap');
        }
      }
    );
    expect(toEditableData(data)).toEqual({ editable: true, text: '{\n  "a": 1\n}', exact: false });
  });

  it("refuses data JSON can't write", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    for (const data of [circular, 10n, { id: 10n }, () => {}, Symbol('id')]) {
      expect(toEditableData(data)).toEqual({ editable: false, reason: expect.any(String) });
    }
  });
});

describe('parseEditedData', () => {
  it('parses valid JSON', () => {
    expect(parseEditedData('{ "name": "Ada" }')).toEqual({ ok: true, data: { name: 'Ada' } });
    expect(parseEditedData('null')).toEqual({ ok: true, data: null });
  });

  it('explains invalid JSON', () => {
    expect(parseEditedData('{ name: "Ada" }')).toEqual({
      ok: false,
      message: expect.stringMatching(/^Invalid JSON: /)
    });
  });

  it('asks for a value when the text is empty', () => {
    expect(parseEditedData('  \n')).toEqual({
      ok: false,
      message: expect.stringContaining('null')
    });
  });
});
