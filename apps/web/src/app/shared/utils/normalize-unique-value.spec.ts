import { describe, expect, it } from 'vitest';
import { normalizeTaxId, normalizeUniqueName } from './normalize-unique-value';

describe('unique value normalization', () => {
  it('treats accents, casing and repeated spaces as the same name', () => {
    expect(normalizeUniqueName('  Auditoría   HSEQ ')).toBe(normalizeUniqueName('auditoria hseq'));
  });

  it('treats formatted and unformatted tax ids as the same value', () => {
    expect(normalizeTaxId('900.123.456-7')).toBe(normalizeTaxId('9001234567'));
  });
});
