import { describe, expect, it } from 'vitest';
import { getStatus } from './status.ts';

describe('getStatus', () => {
  it('is loading on the first request, before any data', () => {
    expect(getStatus({ isLoading: true, isValidating: true })).toBe('loading');
  });

  it('is validating while revalidating existing data', () => {
    expect(getStatus({ data: 1, isLoading: false, isValidating: true })).toBe('validating');
  });

  it('is validating while retrying after an error', () => {
    expect(getStatus({ error: new Error('x'), isValidating: true })).toBe('validating');
  });

  it('is error when the last request failed', () => {
    expect(getStatus({ data: 1, error: new Error('x'), isValidating: false })).toBe('error');
  });

  it('is success when there is data', () => {
    expect(getStatus({ data: { id: 1 }, isLoading: false, isValidating: false })).toBe('success');
  });

  it('counts falsy data as data', () => {
    expect(getStatus({ data: 0 })).toBe('success');
    expect(getStatus({ data: null })).toBe('success');
  });

  it('is idle with no data, no error and nothing in flight', () => {
    expect(getStatus({})).toBe('idle');
  });
});
