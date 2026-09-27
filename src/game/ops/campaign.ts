import type { AiDifficulty } from '../ai/choose';
import { isMapId, type MapId } from '../maps';

export type MissionId =
  | 'op-spark'
  | 'op-funnel'
  | 'op-core'
  | 'op-well'
  | 'op-twin'
  | 'op-ring'
  | 'op-airlock'
  | 'op-bolts'
  | 'op-seam'
  | 'op-deep'
  | 'op-armor'
  | 'op-nest';

/**
 * A one-shot explanation of a mechanic, carried by the ONE mission that first
 * introduces it. `PlayScene` shows it once when the board opens (banner + coach
 * line) and `TitleScene` tags the mission card with its title; no mission after
 * the first may repeat a title, so a mechanic is never taught twice.
 */
export type MechanicBrief = {
  readonly title: string;
  readonly text: string;
};

export type Mission = {
  readonly id: MissionId;
  readonly index: number;
  readonly title: string;
  readonly dossier: string;
  readonly coach: string;
  readonly mapId: MapId;
  readonly difficulty: AiDifficulty;
  /**
   * Present ONLY on the mission that introduces a mechanic. Absent means this
   * mission teaches nothing new and the player keeps the coach line they had.
   */
  readonly brief?: MechanicBrief;
  readonly swiftMoves: number;
  readonly cascadeWaves: number;
};

export const CAMPAIGN: readonly Mission[] = [
  {
    id: 'op-spark',
    index: 0,
    title: '01  SPARK',
    dossier: 'A cold 3×3 cell. Corners blow at two.',
    coach: 'Stack a corner to 2. It splits. Then wash over Cyan.',
    mapId: 'spark',
    difficulty: 'cadet',
    brief: {
      title: 'THE CORE RULE',
      text: 'A CELL DETONATES AT ITS NEIGHBOUR COUNT. THE PIPS ARE ITS REACH — ONE TOKEN DOWN EACH PIP. LEFTOVER HOLDS.',
    },
    swiftMoves: 10,
    cascadeWaves: 2,
  },
  {
    id: 'op-funnel',
    index: 1,
    title: '02  FUNNEL',
    dossier: 'Tips are relays. The center is a four-way bomb.',
    coach: 'Tips explode on the first core. Feed the center, do not sit in it early.',
    mapId: 'funnel',
    difficulty: 'cadet',
    swiftMoves: 16,
    cascadeWaves: 3,
  },
  {
    id: 'op-core',
    index: 2,
    title: '03  CORE GRID',
    dossier: 'The classic well. Corners 2, edges 3, heart 4.',
    coach: 'Own the corners. A two-stack there is a free split.',
    mapId: 'rect5',
    difficulty: 'operator',
    swiftMoves: 22,
    cascadeWaves: 3,
  },
  {
    id: 'op-well',
    index: 3,
    title: '04  BROKEN WELL',
    dossier: 'A missing plate and a one-way shaft.',
    coach: 'The south shaft is a free pass. Use it to flip the floor above.',
    mapId: 'irregular',
    difficulty: 'operator',
    swiftMoves: 24,
    cascadeWaves: 3,
  },
  {
    id: 'op-twin',
    index: 4,
    title: '05  TWIN STACKS',
    dossier: 'Two rooms, one floor. Whoever crosses first usually ends it.',
    coach: 'Do not get boxed in one stack. The bridge is the kill lane.',
    mapId: 'twin',
    difficulty: 'director',
    swiftMoves: 28,
    cascadeWaves: 4,
  },
  {
    id: 'op-ring',
    index: 5,
    title: '06  THE RING',
    dossier: 'No center. Fire races the rim.',
    coach: 'Critical mass is 2 almost everywhere. Small stacks, long chains.',
    mapId: 'ring',
    difficulty: 'director',
    swiftMoves: 26,
    cascadeWaves: 4,
  },
  {
    id: 'op-airlock',
    index: 6,
    title: '07  AIRLOCK',
    dossier: 'Two rooms. One sealed plate. Drop it and an eater rises there.',
    coach:
      'BLOW THE FRAME TO OPEN THE ROOMS. AN EATER RISES ON THAT PLATE. CLEAR THE SQUARES BESIDE IT BEFORE YOU SWING.',
    mapId: 'airlock',
    difficulty: 'operator',
    brief: {
      title: 'PLATES',
      text: 'PLATES ARE PENDING CELLS. A BLAST BESIDE ONE DROPS IT AND THE SQUARE OPENS — EVERY FALLEN PLATE FREES AN EATER THERE.',
    },
    swiftMoves: 20,
    cascadeWaves: 3,
  },
  {
    id: 'op-bolts',
    index: 7,
    title: '08  BOLTS',
    dossier: 'Three chambers. Two plates in series. Each fall frees an eater.',
    coach:
      'EACH PLATE YOU DROP FREES AN EATER. OPEN THE FIRST LOCK, THEN HOLD THE SECOND UNTIL YOU CAN WALK THROUGH.',
    mapId: 'bolts',
    difficulty: 'operator',
    swiftMoves: 28,
    cascadeWaves: 3,
  },
  {
    id: 'op-seam',
    index: 8,
    title: '09  THE SEAM',
    dossier: 'Two halls. A wall of plates. Every plate you punch frees an eater.',
    coach: 'PICK THE SEAM. EACH FALL FREES AN EATER. EVERY OTHER DOOR STAYS SHUT.',
    mapId: 'seam',
    difficulty: 'director',
    swiftMoves: 32,
    cascadeWaves: 4,
  },
  // Missions 10-12 carry the three maps that had no campaign mission. The ramp is
  // deep geometry -> plate durability -> a whole new actor.
  //
  // `swiftMoves`/`cascadeWaves` BELOW ARE PLACEHOLDERS, chosen by analogy with the
  // closest existing gate (op-deep <- THE RING, op-armor <- THE SEAM, op-nest <- THE
  // SEAM plus a wave of eater chaos). NOTHING has been measured against the current
  // AI: board row=8 owns the calibration measurement, and these numbers must not be
  // tuned here (nor may the existing nine be touched).
  {
    id: 'op-deep',
    index: 9,
    title: '10  DEEP FIELD',
    dossier: 'Corner cells count three, the heart counts eight. Blasts run the diagonals.',
    coach: 'GUN THE CORNERS. A THREE-STACK THERE IS A DIAGONAL BOMB. DO NOT FEED THE HEART.',
    mapId: 'deep',
    difficulty: 'director',
    brief: {
      title: 'DEEP CELLS',
      text: 'A DEEP CELL COUNTS THE DIAGONALS TOO: A CORNER IS 3, AN INTERIOR SQUARE 8. IT ALSO FIRES INTO THEM.',
    },
    swiftMoves: 28,
    cascadeWaves: 4,
  },
  {
    id: 'op-armor',
    index: 10,
    title: '11  BULKHEAD',
    dossier: 'A steel spine. Its three middle plates take two hits: cracking is tempo, dropping is commitment.',
    coach: 'CRACK THE SPINE FIRST, THEN PICK THE ONE PLATE YOU ACTUALLY DROP.',
    mapId: 'bulkhead',
    difficulty: 'director',
    brief: {
      title: 'ARMORED PLATES',
      text: 'AN ARMORED PLATE TAKES TWO DETONATIONS: THE FIRST ONLY CRACKS IT, THE SECOND DROPS IT.',
    },
    swiftMoves: 32,
    cascadeWaves: 4,
  },
  {
    id: 'op-nest',
    index: 11,
    title: '12  NEST',
    dossier: 'Two plates on the rim, two deep hearts inside. The fattest pile beside a plate arms its eater fastest.',
    coach: 'DROP A PLATE ONLY WHEN YOU CAN SURVIVE WHAT EATS ITS WAY OUT OF IT.',
    mapId: 'nest',
    difficulty: 'director',
    brief: {
      title: 'EATERS',
      text: 'A FALLEN PLATE REVEALS AN EATER. IT EATS THE BIGGEST PILE BESIDE IT, THEN DETONATES AT THE DEEP DEGREE OF ITS SQUARE — A NEUTRAL FLOOD, AND IT IS GONE.',
    },
    swiftMoves: 34,
    cascadeWaves: 4,
  },
];

export function missionById(id: MissionId): Mission {
  const found = CAMPAIGN.find((mission) => mission.id === id);
  if (found === undefined) {
    throw new Error(`Unknown mission "${id}"`);
  }
  return found;
}

export function isMissionId(value: string): value is MissionId {
  return CAMPAIGN.some((mission) => mission.id === value);
}

export function nextMission(id: MissionId): Mission | null {
  const current = missionById(id);
  return CAMPAIGN[current.index + 1] ?? null;
}

/**
 * The campaign's map-facing shape, deliberately LOOSER than `Mission` so the
 * hand-written table can be checked at a boundary. `Mission.mapId` is a `MapId`,
 * which already makes a typo a compile error — but this is the runtime twin of
 * that guarantee, so a mission that reached the table through a cast (or a future
 * data source that is not typed) still fails loudly instead of rendering a dead
 * card.
 */
export type MissionShape = {
  readonly id: string;
  readonly index: number;
  readonly mapId: string;
  readonly brief?: { readonly title: string } | undefined;
};

/**
 * Every reason a mission table cannot be played. A mission must point at a shipped
 * map, and a mission carrying a mechanic brief must have a map to teach it on.
 */
export function campaignProblems(missions: readonly MissionShape[] = CAMPAIGN): readonly string[] {
  const problems: string[] = [];
  for (const mission of missions) {
    if (!isMapId(mission.mapId)) {
      problems.push(`mission "${mission.id}" points at unknown map "${mission.mapId}"`);
    }
    if (mission.brief !== undefined && mission.mapId.trim() === '') {
      problems.push(`mission "${mission.id}" has a mechanic brief but no map`);
    }
  }
  return problems;
}

export function assertCampaignIntegrity(missions: readonly MissionShape[] = CAMPAIGN): void {
  const problems = campaignProblems(missions);
  if (problems.length > 0) {
    throw new Error(`Campaign is invalid: ${problems.join('; ')}`);
  }
}
