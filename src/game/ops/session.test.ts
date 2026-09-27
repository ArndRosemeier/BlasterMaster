import { describe, expect, it } from 'vitest';
import { requirePlaySceneData } from './session';

describe('requirePlaySceneData', () => {
  it('accepts hotseat and AI sessions and rejects incomplete AI data', () => {
    expect(requirePlaySceneData({ mode: 'hotseat', mapId: 'spark' })).toEqual({
      mode: 'hotseat',
      mapId: 'spark',
    });
    expect(
      requirePlaySceneData({ mode: 'ai', mapId: 'ring', difficulty: 'director', missionId: 'op-ring' }),
    ).toEqual({
      mode: 'ai',
      mapId: 'ring',
      difficulty: 'director',
      missionId: 'op-ring',
    });
    expect(() => requirePlaySceneData({ mode: 'ai', mapId: 'spark' })).toThrow(/difficulty/);
    expect(() => requirePlaySceneData({})).toThrow(/mode and mapId/);
  });
});
