import { describe, expect, it } from 'vitest';
import { ProgressCorruptError, isMissionUnlocked, loadProgress, loadProgressOrReset, memoryStore, recordStars, starsFor } from './progress';

describe('campaign progress', () => {
  it('unlocks only the first op until a star is recorded', () => {
    const store = memoryStore();
    const fresh = loadProgress(store);
    expect(isMissionUnlocked(fresh, 'op-spark')).toBe(true);
    expect(isMissionUnlocked(fresh, 'op-funnel')).toBe(false);
    const after = recordStars(store, 'op-spark', 2);
    expect(starsFor(after, 'op-spark')).toBe(2);
    expect(isMissionUnlocked(after, 'op-funnel')).toBe(true);
    expect(isMissionUnlocked(after, 'op-core')).toBe(false);
    expect(isMissionUnlocked(after, 'op-airlock')).toBe(false);
    recordStars(store, 'op-ring', 1);
    expect(isMissionUnlocked(loadProgress(store), 'op-airlock')).toBe(true);
    expect(isMissionUnlocked(loadProgress(store), 'op-bolts')).toBe(false);
  });

  it('keeps the best star count and resets corrupt saves', () => {
    const store = memoryStore();
    recordStars(store, 'op-spark', 1);
    recordStars(store, 'op-spark', 3);
    recordStars(store, 'op-spark', 2);
    expect(starsFor(loadProgress(store), 'op-spark')).toBe(3);

    store.setItem('blaster-master-ops', '{not-json');
    expect(() => loadProgress(store)).toThrow(ProgressCorruptError);
    const reset = loadProgressOrReset(store);
    expect(reset).toEqual({ version: 1, stars: {} });
  });
});
