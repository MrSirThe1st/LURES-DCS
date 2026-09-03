import { describe, expect, it } from 'vitest';
import { isNonEmptyString } from './index.js';

describe('isNonEmptyString', () => {
  it('accepts trimmed non-empty strings', () => {
    expect(isNonEmptyString('abc')).toBe(true);
  });

  it('rejects blank strings', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });
});
