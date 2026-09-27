import { describe, expect, it } from 'vitest';
import { MAP_LIST } from '../maps';
import {
  CAMPAIGN,
  assertCampaignIntegrity,
  campaignProblems,
  missionById,
  nextMission,
} from './campaign';
import { isMissionUnlocked, loadProgressOrReset, memoryStore, recordStars } from './progress';

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

/**
 * The owner asked for ALL maps to be playable from OPERATIONS. A pin, not a
 * promise: a future map added to MAP_LIST without a mission turns this red, so
 * "every map" cannot quietly stop being true.
 */
describe('campaign map coverage', () => {
  it('gives every shipped map at least one campaign mission', () => {
    const covered = new Set<string>(CAMPAIGN.map((mission) => mission.mapId));
    for (const map of MAP_LIST) {
      expect(covered.has(map.id), `map "${map.id}" has no campaign mission`).toBe(true);
    }
    expect(covered.size).toBe(MAP_LIST.length);
  });

  it('resolves every mission to a shipped map and fails loudly when it cannot', () => {
    // The real table is clean ...
    assertCampaignIntegrity();
    expect(campaignProblems()).toEqual([]);
    // ... and the check is a real discriminator, not a tautology: an unknown map
    // and a brief with no map to teach it on are both problems.
    expect(campaignProblems([{ id: 'op-ghost', index: 0, mapId: 'no-such-map' }])).toEqual([
      'mission "op-ghost" points at unknown map "no-such-map"',
    ]);
    expect(campaignProblems([{ id: 'op-blank', index: 0, mapId: '', brief: { title: 'X' } }])).toEqual(
      [
        'mission "op-blank" points at unknown map ""',
        'mission "op-blank" has a mechanic brief but no map',
      ],
    );
    expect(() =>
      assertCampaignIntegrity([{ id: 'op-ghost', index: 0, mapId: 'no-such-map' }]),
    ).toThrow(/Campaign is invalid/);
  });
});

describe('campaign shape', () => {
  it('has twelve missions with unique ids and contiguous indices', () => {
    expect(CAMPAIGN).toHaveLength(12);
    expect(new Set(CAMPAIGN.map((mission) => mission.id)).size).toBe(12);
    CAMPAIGN.forEach((mission, index) => {
      expect(mission.index, `mission ${mission.id} index`).toBe(index);
    });
  });

  it('chains nextMission through the appended missions to the end', () => {
    expect(nextMission(missionById('op-seam').id)?.id).toBe('op-deep');
    expect(nextMission(missionById('op-deep').id)?.id).toBe('op-armor');
    expect(nextMission(missionById('op-armor').id)?.id).toBe('op-nest');
    expect(nextMission(missionById('op-nest').id)).toBeNull();
  });

  it('unlocks each mission only after the one before it is cleared', () => {
    const store = memoryStore();

    // Nothing is cleared: only the FIRST mission is open.
    const fresh = loadProgressOrReset(store);
    expect(isMissionUnlocked(fresh, missionById('op-spark').id)).toBe(true);
    for (const mission of CAMPAIGN.slice(1)) {
      expect(isMissionUnlocked(fresh, mission.id), `${mission.id} open with no stars`).toBe(false);
    }

    // Clearing them in order opens each next mission, and only that one.
    for (const [index, mission] of CAMPAIGN.entries()) {
      const progress = recordStars(store, mission.id, 1);
      const following = CAMPAIGN[index + 1];
      if (following === undefined) {
        continue;
      }
      expect(isMissionUnlocked(progress, following.id), `${following.id} still locked`).toBe(true);
      const after = CAMPAIGN[index + 2];
      if (after !== undefined) {
        expect(isMissionUnlocked(progress, after.id), `${after.id} opened early`).toBe(false);
      }
    }
  });
});

/**
 * The brief is introduced ONCE per mechanic. A mission carries a brief only when
 * it is the first place that mechanic can be met, so two missions may never share
 * a brief title — and the campaign must open with the core rule.
 */
describe('mechanic briefs', () => {
  const briefed = CAMPAIGN.flatMap((mission) =>
    mission.brief === undefined ? [] : [{ mission, brief: mission.brief }],
  );

  it('introduces each mechanic on exactly one mission', () => {
    const titles = briefed.map((entry) => entry.brief.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(
        briefed.filter((entry) => entry.brief.title === title),
        `mechanic "${title}" introduced more than once`,
      ).toHaveLength(1);
    }
  });

  it('carries exactly the five mechanics the engine has, in campaign order', () => {
    expect(briefed.map((entry) => entry.brief.title)).toEqual([
      'THE CORE RULE',
      'PLATES',
      'DEEP CELLS',
      'ARMORED PLATES',
      'EATERS',
    ]);
    expect(briefed.map((entry) => entry.mission.index)).toEqual([0, 6, 9, 10, 11]);
  });

  it('opens the campaign with the core rule and never repeats it', () => {
    const first = missionById('op-spark');
    expect(first.index).toBe(0);
    expect(first.brief?.title).toBe('THE CORE RULE');
    expect(first.brief?.text).toContain('NEIGHBOUR COUNT');
    expect(first.brief?.text).toContain('PIPS');
    expect(first.brief?.text).toContain('LEFTOVER HOLDS');
    for (const mission of CAMPAIGN.slice(1)) {
      expect(mission.brief?.title ?? '').not.toBe('THE CORE RULE');
    }
  });

  it('gives every brief a title and real text', () => {
    for (const entry of briefed) {
      expect(entry.brief.title.length).toBeGreaterThan(0);
      expect(entry.brief.text.length).toBeGreaterThan(0);
    }
  });
});
