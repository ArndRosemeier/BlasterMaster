import type { AiDifficulty } from '../ai/choose';
import type { MapId } from '../maps';

export type MissionId =
  | 'op-spark'
  | 'op-funnel'
  | 'op-core'
  | 'op-well'
  | 'op-twin'
  | 'op-ring'
  | 'op-airlock'
  | 'op-bolts'
  | 'op-seam';

export type Mission = {
  readonly id: MissionId;
  readonly index: number;
  readonly title: string;
  readonly dossier: string;
  readonly coach: string;
  readonly mapId: MapId;
  readonly difficulty: AiDifficulty;
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
    dossier: 'Two rooms. One sealed plate. Blast a doorframe to drop it.',
    coach: 'BLOW THE FRAME. THE PLATE FALLS EMPTY. FRAMES GO FROM 3 TO 4.',
    mapId: 'airlock',
    difficulty: 'operator',
    swiftMoves: 20,
    cascadeWaves: 3,
  },
  {
    id: 'op-bolts',
    index: 7,
    title: '08  BOLTS',
    dossier: 'Three chambers. Two plates in series. Do not open what you cannot hold.',
    coach: 'OPEN THE FIRST LOCK. HOLD THE SECOND UNTIL YOU CAN WALK THROUGH.',
    mapId: 'bolts',
    difficulty: 'operator',
    swiftMoves: 28,
    cascadeWaves: 3,
  },
  {
    id: 'op-seam',
    index: 8,
    title: '09  THE SEAM',
    dossier: 'Two halls. A wall of plates. Where you punch is the only bridge.',
    coach: 'PICK THE SEAM. THAT FRAME GETS SAFER. EVERY OTHER DOOR STAYS SHUT.',
    mapId: 'seam',
    difficulty: 'director',
    swiftMoves: 32,
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
