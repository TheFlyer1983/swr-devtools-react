import { afterEach, describe, expect, it } from 'vitest';
import { loadPanelState, STORAGE_KEY, type PanelState } from './storage.ts';

const fallback: PanelState = { isOpen: false, height: 320, width: 480 };

function load(raw: string): PanelState {
  localStorage.setItem(STORAGE_KEY, raw);
  return loadPanelState(fallback);
}

afterEach(() => {
  localStorage.clear();
});

describe('loadPanelState', () => {
  it('uses the fallback when nothing is saved', () => {
    expect(loadPanelState(fallback)).toEqual(fallback);
  });

  it('reads saved values', () => {
    expect(load('{"isOpen":true,"height":200,"width":600}')).toEqual({
      isOpen: true,
      height: 200,
      width: 600
    });
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-object', '42'],
    ['null', 'null']
  ])('uses the fallback for %s', (_, raw) => {
    expect(load(raw)).toEqual(fallback);
  });

  it('replaces only the fields that are missing or invalid', () => {
    expect(load('{"isOpen":"yes","height":-5,"width":600}')).toEqual({
      isOpen: false,
      height: 320,
      width: 600
    });
  });
});
