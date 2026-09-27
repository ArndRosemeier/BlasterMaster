import { cellId, parseCellId } from './ids';
import type { Board, CellId, CellState, MapCell, MapDefinition, PlayerId, TokenSeed } from './types';

const ORTHO: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function orthoNeighborIds(x: number, y: number): readonly CellId[] {
  return ORTHO.map((step) => cellId(x + step.dx, y + step.dy));
}

function cellNeighbors(cellSet: ReadonlySet<CellId>, x: number, y: number): CellId[] {
  const neighbors: CellId[] = [];
  for (const id of orthoNeighborIds(x, y)) {
    if (cellSet.has(id)) {
      neighbors.push(id);
    }
  }
  return neighbors;
}

function collectCoords(
  items: readonly MapCell[],
  label: string,
  mapId: string,
): Map<CellId, MapCell> {
  const out = new Map<CellId, MapCell>();
  for (const item of items) {
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y)) {
      throw new Error(`Map "${mapId}" has non-integer ${label} (${item.x}, ${item.y})`);
    }
    const id = cellId(item.x, item.y);
    if (out.has(id)) {
      throw new Error(`Map "${mapId}" has duplicate ${label} ${id}`);
    }
    out.set(id, item);
  }
  return out;
}

function rewireCells(cells: Readonly<Record<CellId, CellState>>): Record<CellId, CellState> {
  const ids = new Set(Object.keys(cells) as CellId[]);
  const next: Record<CellId, CellState> = {};
  for (const cell of Object.values(cells)) {
    const neighbors = cellNeighbors(ids, cell.x, cell.y);
    if (neighbors.length === 0) {
      throw new Error(`Cell ${cell.id} is isolated after rewire`);
    }
    next[cell.id] = {
      ...cell,
      neighbors,
    };
  }
  return next;
}

export function createBoard(map: MapDefinition): Board {
  if (map.cells.length === 0) {
    throw new Error(`Map "${map.id}" has no cells`);
  }

  const cellCoords = collectCoords(map.cells, 'cell', map.id);
  const wallCoords = collectCoords(map.walls, 'wall', map.id);
  for (const id of wallCoords.keys()) {
    if (cellCoords.has(id)) {
      throw new Error(`Map "${map.id}" has overlapping cell and wall ${id}`);
    }
  }

  const cellSet = new Set(cellCoords.keys());
  const cells: Record<CellId, CellState> = {};
  for (const [id, coord] of cellCoords) {
    const neighbors = cellNeighbors(cellSet, coord.x, coord.y);
    if (neighbors.length === 0) {
      throw new Error(`Map "${map.id}" has isolated cell ${id}`);
    }
    cells[id] = {
      id,
      x: coord.x,
      y: coord.y,
      neighbors,
      count: 0,
      owner: null,
    };
  }

  const walls: CellId[] = [];
  for (const [id, coord] of wallCoords) {
    const touchesCell = orthoNeighborIds(coord.x, coord.y).some((neighbor) => cellSet.has(neighbor));
    if (!touchesCell) {
      throw new Error(`Map "${map.id}" has orphan wall ${id}`);
    }
    walls.push(id);
  }
  walls.sort();

  return { cells, walls };
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

export function boardWalls(board: Board): readonly CellId[] {
  return board.walls;
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

export function isNearCritical(cell: CellState): boolean {
  return cell.owner !== null && cell.count === cell.neighbors.length - 1 && cell.count > 0;
}

export function nearCriticalCount(board: Board, player: PlayerId): number {
  let count = 0;
  for (const cell of boardCells(board)) {
    if (cell.owner === player && isNearCritical(cell)) {
      count += 1;
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

  return { cells: next, walls: board.walls };
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
    walls: board.walls,
  };
}

export function hashBoard(board: Board): string {
  const cells = Object.keys(board.cells)
    .sort()
    .map((id) => {
      const cell = getCell(board, id as CellId);
      return `${id}:${cell.owner ?? '-'}:${cell.count}`;
    })
    .join('|');
  const walls = [...board.walls].sort().join(',');
  return `${cells}|#w:${walls}`;
}

export function collapseWalls(
  board: Board,
  exploded: readonly CellId[],
): { readonly board: Board; readonly collapsed: readonly CellId[] } {
  if (exploded.length === 0 || board.walls.length === 0) {
    return { board, collapsed: [] };
  }

  const explodedSet = new Set(exploded);
  const falling: CellId[] = [];
  for (const wallId of board.walls) {
    const pos = parseCellId(wallId);
    if (orthoNeighborIds(pos.x, pos.y).some((neighbor) => explodedSet.has(neighbor))) {
      falling.push(wallId);
    }
  }
  falling.sort();
  if (falling.length === 0) {
    return { board, collapsed: [] };
  }

  const fallSet = new Set(falling);
  const cells: Record<CellId, CellState> = { ...board.cells };
  for (const id of falling) {
    const pos = parseCellId(id);
    cells[id] = {
      id,
      x: pos.x,
      y: pos.y,
      neighbors: [],
      count: 0,
      owner: null,
    };
  }

  return {
    board: {
      cells: rewireCells(cells),
      walls: board.walls.filter((id) => !fallSet.has(id)),
    },
    collapsed: falling,
  };
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
  const visit = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const cell of cells) {
    visit(cell.x, cell.y);
  }
  for (const wallId of board.walls) {
    const pos = parseCellId(wallId);
    visit(pos.x, pos.y);
  }
  return { minX, maxX, minY, maxY };
}
