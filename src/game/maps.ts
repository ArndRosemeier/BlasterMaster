import { createBoard } from './engine/board';
import type { MapCell, MapDefinition } from './engine/types';

const OCCUPIED = '#';

export function cellsFromRows(rows: readonly string[]): readonly MapCell[] {
  const cells: MapCell[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((glyph, x) => {
      if (glyph === OCCUPIED) {
        cells.push({ x, y });
      }
    });
  });
  return cells;
}

export const RECT_5: MapDefinition = {
  id: 'rect5',
  name: 'CORE GRID',
  cells: cellsFromRows(['#####', '#####', '#####', '#####', '#####']),
};

export const IRREGULAR: MapDefinition = {
  id: 'irregular',
  name: 'BROKEN WELL',
  cells: cellsFromRows(['.##..', '#####', '##.##', '#####', '.###.', '..#..']),
};

export const MAPS = {
  rect5: RECT_5,
  irregular: IRREGULAR,
} as const;

export type MapId = keyof typeof MAPS;

export const MAP_LIST: readonly MapDefinition[] = [RECT_5, IRREGULAR];

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
