import { describe, expect, it } from 'vitest';
import { publicAsset } from './publicAsset';

describe('publicAsset', () => {
  it('prefixes Vite BASE_URL and strips a leading slash', () => {
    expect(publicAsset('/assets/bg-title.png')).toBe(`${import.meta.env.BASE_URL}assets/bg-title.png`);
    expect(publicAsset('assets/bg-play.png')).toBe(`${import.meta.env.BASE_URL}assets/bg-play.png`);
  });

  it('rejects an empty path', () => {
    expect(() => publicAsset('')).toThrow(/non-empty/);
    expect(() => publicAsset('///')).toThrow(/non-empty/);
  });
});
