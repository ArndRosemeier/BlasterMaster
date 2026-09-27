import { createBoard } from './engine/board';
import type { MapCell, MapDefinition } from './engine/types';

const CELL = '#';
const WALL = '=';
const VOID = '.';
/** Deep cell: a cell that also counts and fires on the diagonals. */
const DEEP = '*';
/** Armored plate: a wall that takes TWO detonations — the first only cracks it. */
const ARMORED = '+';
/** Housing: an armored plate that REVEALS an eater when it finally falls. */
const HOUSING = '@';

export function tilesFromRows(rows: readonly string[]): {
  readonly cells: readonly MapCell[];
  readonly walls: readonly MapCell[];
  readonly armored: readonly MapCell[];
  readonly housing: readonly MapCell[];
  readonly deep: readonly MapCell[];
} {
  const cells: MapCell[] = [];
  const walls: MapCell[] = [];
  const armored: MapCell[] = [];
  const housing: MapCell[] = [];
  const deep: MapCell[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((glyph, x) => {
      if (glyph === CELL) {
        cells.push({ x, y });
        return;
      }
      if (glyph === DEEP) {
        cells.push({ x, y });
        deep.push({ x, y });
        return;
      }
      if (glyph === WALL || glyph === ARMORED || glyph === HOUSING) {
        // An armored plate IS a wall, and a housing IS an armored plate: each list
        // is only the narrower fact, never a third kind of tile.
        walls.push({ x, y });
        if (glyph === ARMORED || glyph === HOUSING) {
          armored.push({ x, y });
        }
        if (glyph === HOUSING) {
          housing.push({ x, y });
        }
        return;
      }
      if (glyph === VOID) {
        return;
      }
      throw new Error(`Unknown map glyph "${glyph}" at (${x}, ${y})`);
    });
  });
  return { cells, walls, armored, housing, deep };
}

export function cellsFromRows(rows: readonly string[]): readonly MapCell[] {
  const tiles = tilesFromRows(rows);
  if (tiles.walls.length > 0) {
    throw new Error('cellsFromRows cannot parse wall glyphs; use tilesFromRows or mapFromRows');
  }
  if (tiles.deep.length > 0) {
    throw new Error('cellsFromRows cannot parse deep glyphs; use tilesFromRows or mapFromRows');
  }
  return tiles.cells;
}

export function mapFromRows(id: string, name: string, rows: readonly string[]): MapDefinition {
  const tiles = tilesFromRows(rows);
  return {
    id,
    name,
    cells: tiles.cells,
    walls: tiles.walls,
    armored: tiles.armored,
    housing: tiles.housing,
    deep: tiles.deep,
  };
}

export const SPARK: MapDefinition = mapFromRows('spark', 'SPARK', ['###', '###', '###']);

export const FUNNEL: MapDefinition = mapFromRows('funnel', 'FUNNEL', [
  '..#..',
  '.###.',
  '#####',
  '.###.',
  '..#..',
]);

export const RECT_5: MapDefinition = mapFromRows('rect5', 'CORE GRID', [
  '#####',
  '#####',
  '#####',
  '#####',
  '#####',
]);

export const IRREGULAR: MapDefinition = mapFromRows('irregular', 'BROKEN WELL', [
  '.##..',
  '#####',
  '##.##',
  '#####',
  '.###.',
  '..#..',
]);

export const TWIN_STACKS: MapDefinition = mapFromRows('twin', 'TWIN STACKS', [
  '###.###',
  '###.###',
  '#######',
  '###.###',
  '###.###',
]);

export const RING: MapDefinition = mapFromRows('ring', 'THE RING', [
  '#####',
  '#...#',
  '#...#',
  '#...#',
  '#####',
]);

export const AIRLOCK: MapDefinition = mapFromRows('airlock', 'AIRLOCK', [
  '###.###',
  '###=###',
  '###.###',
]);

export const BOLTS: MapDefinition = mapFromRows('bolts', 'BOLTS', [
  '###.###.###',
  '###=###=###',
  '###.###.###',
]);

export const SEAM: MapDefinition = mapFromRows('seam', 'THE SEAM', [
  '####=####',
  '####=####',
  '####=####',
  '####=####',
  '####=####',
]);

export const DEEP_FIELD: MapDefinition = mapFromRows('deep', 'DEEP FIELD', [
  '*####',
  '#####',
  '##*##',
  '#####',
  '####*',
]);

/**
 * The armored-plate map: a steel bulkhead runs down the middle, three `+` plates
 * deep, with a one-hit `=` at each end. The two-hit plates turn the map's central
 * verb — how many waves a lane costs you — into a resource: cracking is tempo,
 * dropping is commitment.
 */
export const BULKHEAD: MapDefinition = mapFromRows('bulkhead', 'BULKHEAD', [
  '###=#####',
  '####+####',
  '###*+####',
  '####+####',
  '#####=###',
]);

/**
 * The eater map: two `@` HOUSINGS on the top and bottom edge, 180-degree symmetric
 * so neither seat is nearer one. An edge square's deep degree is FIVE, so a fat
 * stack beside a housing arms its eater on the spot — and the eater eats the
 * biggest ortho neighbour it can see, which is exactly the pile the map invites
 * you to build. The two `*` cells in the middle are the payoff for standing off.
 */
export const NEST: MapDefinition = mapFromRows('nest', 'NEST', [
  '###@###',
  '#######',
  '##*#*##',
  '#######',
  '###@###',
]);

export const MAPS = {
  spark: SPARK,
  funnel: FUNNEL,
  rect5: RECT_5,
  irregular: IRREGULAR,
  twin: TWIN_STACKS,
  ring: RING,
  airlock: AIRLOCK,
  bolts: BOLTS,
  seam: SEAM,
  deep: DEEP_FIELD,
  bulkhead: BULKHEAD,
  nest: NEST,
} as const;

export type MapId = keyof typeof MAPS;

export const MAP_LIST: readonly MapDefinition[] = [
  SPARK,
  FUNNEL,
  RECT_5,
  IRREGULAR,
  TWIN_STACKS,
  RING,
  AIRLOCK,
  BOLTS,
  SEAM,
  DEEP_FIELD,
  BULKHEAD,
  NEST,
];

export function isMapId(value: string): value is MapId {
  return value in MAPS;
}

export function getMap(id: MapId): MapDefinition {
  return MAPS[id];
}

export function requireMap(id: string): MapDefinition {
  if (!isMapId(id)) {
    throw new Error(`Unknown map "${id}"`);
  }
  return MAPS[id];
}

/** Validates shipped maps at import time for tests and boot. */
export function assertShippedMaps(): void {
  for (const map of MAP_LIST) {
    createBoard(map);
  }
}
