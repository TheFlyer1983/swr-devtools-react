import { describe, expect, it } from 'vitest';
import { getKeyKind } from './key-kind.ts';

describe('getKeyKind', () => {
  it('detects infinite keys', () => {
    expect(getKeyKind('$inf$/api/posts')).toBe('infinite');
  });

  it('detects subscription keys', () => {
    expect(getKeyKind('$sub$/api/feed')).toBe('subscription');
  });

  it('treats everything else as standard', () => {
    expect(getKeyKind('/api/user')).toBe('standard');
  });
});
