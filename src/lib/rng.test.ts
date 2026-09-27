import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('is deterministic and stays in range', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sample = [a(), a(), a()];
    expect(sample).toEqual([b(), b(), b()]);
    expect(sample.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
