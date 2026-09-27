import { createBoard } from './engine/board';
import type { MapCell, MapDefinition } from './engine/types';

const CELL = '#';
const WALL = '=';
const VOID = '.';
/** Deep cell: a cell that also counts and fires on the diagonals. */
const DEEP = '*';

export function tilesFromRows(rows: readonly string[]): {
  readonly cells: readonly MapCell[];
  readonly walls: readonly MapCell[];
  readonly deep: readonly MapCell[];
} {
  const cells: MapCell[] = [];
  const walls: MapCell[] = [];
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
      if (glyph === WALL) {
        walls.push({ x, y });
        return;
      }
      if (glyph === VOID) {
        return;
      }
      throw new Error(`Unknown map glyph "${glyph}" at (${x}, ${y})`);
    });
  });
  return { cells, walls, deep };
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
  return { id, name, cells: tiles.cells, walls: tiles.walls, deep: tiles.deep };
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
