import { cellId } from './ids';
import type { Board, CellId, CellState, MapDefinition, PlayerId, TokenSeed } from './types';

const ORTHO: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function createBoard(map: MapDefinition): Board {
  if (map.cells.length === 0) {
    throw new Error(`Map "${map.id}" has no cells`);
  }

  const present = new Set<CellId>();
  for (const { x, y } of map.cells) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`Map "${map.id}" has non-integer coordinate (${x}, ${y})`);
    }
    const id = cellId(x, y);
    if (present.has(id)) {
      throw new Error(`Map "${map.id}" has duplicate cell ${id}`);
    }
    present.add(id);
  }

  const cells: Record<CellId, CellState> = {};
  for (const { x, y } of map.cells) {
    const id = cellId(x, y);
    const neighbors: CellId[] = [];
    for (const { dx, dy } of ORTHO) {
      const neighbor = cellId(x + dx, y + dy);
      if (present.has(neighbor)) {
        neighbors.push(neighbor);
      }
    }
    if (neighbors.length === 0) {
      throw new Error(`Map "${map.id}" has isolated cell ${id}`);
    }
    cells[id] = {
      id,
      x,
      y,
      neighbors,
      count: 0,
      owner: null,
    };
  }

  return { cells };
}

export function getCell(board: Board, id: CellId): CellState {
  const cell = board.cells[id];
  if (cell === undefined) {
    throw new Error(`Unknown cell ${id}`);
  }
  return cell;
}

export function boardCells(board: Board): readonly CellState[] {
  return Object.values(board.cells);
}

export function occupiedCount(board: Board, player: PlayerId): number {
  let count = 0;
  for (const cell of boardCells(board)) {
    if (cell.owner === player) {
      count += 1;
    }
  }
  return count;
}

export function tokenCount(board: Board, player: PlayerId): number {
  let count = 0;
  for (const cell of boardCells(board)) {
    if (cell.owner === player) {
      count += cell.count;
    }
  }
  return count;
}

export function legalMoves(board: Board, player: PlayerId): readonly CellId[] {
  const moves: CellId[] = [];
  for (const cell of boardCells(board)) {
    if (cell.owner === null || cell.owner === player) {
      moves.push(cell.id);
    }
  }
  return moves;
}

export function seedBoard(board: Board, seeds: readonly TokenSeed[]): Board {
  const next: Record<CellId, CellState> = { ...board.cells };
  const seen = new Set<CellId>();

  for (const seed of seeds) {
    if (seen.has(seed.id)) {
      throw new Error(`Duplicate seed for cell ${seed.id}`);
    }
    seen.add(seed.id);
    if (!Number.isInteger(seed.count) || seed.count < 1) {
      throw new Error(`Seed ${seed.id} count must be an integer >= 1`);
    }
    const cell = next[seed.id];
    if (cell === undefined) {
      throw new Error(`Unknown seed cell ${seed.id}`);
    }
    next[seed.id] = {
      ...cell,
      count: seed.count,
      owner: seed.owner,
    };
  }

  return { cells: next };
}

export function replaceCell(
  board: Board,
  id: CellId,
  patch: Pick<CellState, 'count' | 'owner'>,
): Board {
  const cell = getCell(board, id);
  return {
    cells: {
      ...board.cells,
      [id]: {
        ...cell,
        count: patch.count,
        owner: patch.owner,
      },
    },
  };
}

export function hashBoard(board: Board): string {
  return Object.keys(board.cells)
    .sort()
    .map((id) => {
      const cell = getCell(board, id as CellId);
      return `${id}:${cell.owner ?? '-'}:${cell.count}`;
    })
    .join('|');
}

export function mapBounds(board: Board): {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
} {
  const cells = boardCells(board);
  const first = cells[0];
  if (first === undefined) {
    throw new Error('Board has no cells');
  }
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (const cell of cells) {
    if (cell.x < minX) minX = cell.x;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.y > maxY) maxY = cell.y;
  }
  return { minX, maxX, minY, maxY };
}
