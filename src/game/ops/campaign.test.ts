import { describe, expect, it } from 'vitest';
import { CAMPAIGN, missionById } from './campaign';

/**
 * The wall missions used to promise that a dropped plate leaves an EMPTY square.
 * Every fallen plate frees an eater now, so that promise is false text — and a
 * player must be able to learn the rule BEFORE they break a plate. This pins both
 * halves: the false line is gone, and the true rule is named.
 */
describe('the wall missions describe what actually happens', () => {
  const WALL_MISSIONS = ['op-airlock', 'op-bolts', 'op-seam'] as const;

  it('no longer promises an empty plate anywhere in the campaign text', () => {
    for (const mission of CAMPAIGN) {
      expect(`${mission.dossier} ${mission.coach}`).not.toContain('FALLS EMPTY');
    }
  });

  it('tells the player a fall frees an eater, before they break a plate', () => {
    for (const id of WALL_MISSIONS) {
      const mission = missionById(id);
      expect(`${mission.dossier} ${mission.coach}`.toLowerCase()).toContain('eater');
    }
  });
});
