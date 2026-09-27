import { cellId, parseCellId } from './ids';
import type { Board, CellId, CellState, MapCell, MapDefinition, PlayerId, TokenSeed } from './types';

type Step = { readonly dx: number; readonly dy: number };

const ORTHO: readonly Step[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

const DIAG: readonly Step[] = [
  { dx: 1, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
];

export function orthoNeighborIds(x: number, y: number): readonly CellId[] {
  return ORTHO.map((step) => cellId(x + step.dx, y + step.dy));
}

export function diagNeighborIds(x: number, y: number): readonly CellId[] {
  return DIAG.map((step) => cellId(x + step.dx, y + step.dy));
}

function liveCells(cellSet: ReadonlySet<CellId>, ids: readonly CellId[]): CellId[] {
  return ids.filter((id) => cellSet.has(id));
}

/**
 * Detonation threshold: one token per outgoing edge. A deep cell fires into its
 * diagonals as well, so its threshold is ortho degree + diagonal degree.
 * Keeping threshold === firing edges is what keeps the cascade token-conserving.
 */
export function threshold(cell: CellState): number {
  return cell.neighbors.length + cell.diagonals.length;
}

/** Every cell this one dumps a token into when it detonates. */
export function blastTargets(cell: CellState): readonly CellId[] {
  if (cell.diagonals.length === 0) {
    return cell.neighbors;
  }
  return [...cell.neighbors, ...cell.diagonals];
}

export function isCritical(cell: CellState): boolean {
  return cell.count >= threshold(cell);
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
    const neighbors = liveCells(ids, orthoNeighborIds(cell.x, cell.y));
    const diagonals = cell.deep ? liveCells(ids, diagNeighborIds(cell.x, cell.y)) : [];
    if (neighbors.length + diagonals.length === 0) {
      throw new Error(`Cell ${cell.id} is isolated after rewire`);
    }
    next[cell.id] = {
      ...cell,
      neighbors,
      diagonals,
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
  const armoredCoords = collectCoords(map.armored, 'armored plate', map.id);
  const deepCoords = collectCoords(map.deep, 'deep cell', map.id);
  for (const id of armoredCoords.keys()) {
    // An armored plate is a WALL with two hit points, never a third kind of tile.
    if (!wallCoords.has(id)) {
      throw new Error(`Map "${map.id}" marks unknown plate ${id} as armored`);
    }
  }
  for (const id of wallCoords.keys()) {
    if (cellCoords.has(id)) {
      throw new Error(`Map "${map.id}" has overlapping cell and wall ${id}`);
    }
  }
  for (const id of deepCoords.keys()) {
    if (wallCoords.has(id)) {
      throw new Error(`Map "${map.id}" marks wall ${id} as deep`);
    }
    if (!cellCoords.has(id)) {
      throw new Error(`Map "${map.id}" marks unknown cell ${id} as deep`);
    }
  }

  const cellSet = new Set(cellCoords.keys());
  const cells: Record<CellId, CellState> = {};
  for (const [id, coord] of cellCoords) {
    const deep = deepCoords.has(id);
    const neighbors = liveCells(cellSet, orthoNeighborIds(coord.x, coord.y));
    const diagonals = deep ? liveCells(cellSet, diagNeighborIds(coord.x, coord.y)) : [];
    if (neighbors.length + diagonals.length === 0) {
      throw new Error(`Map "${map.id}" has isolated cell ${id}`);
    }
    cells[id] = {
      id,
      x: coord.x,
      y: coord.y,
      neighbors,
      diagonals,
      deep,
      count: 0,
      owner: null,
    };
  }

  const walls: CellId[] = [];
  for (const [id, coord] of wallCoords) {
    const touchesCell =
      orthoNeighborIds(coord.x, coord.y).some((neighbor) => cellSet.has(neighbor)) ||
      diagNeighborIds(coord.x, coord.y).some(
        (neighbor) => cellSet.has(neighbor) && deepCoords.has(neighbor),
      );
    if (!touchesCell) {
      throw new Error(`Map "${map.id}" has orphan wall ${id}`);
    }
    walls.push(id);
  }
  walls.sort();

  // The armored plates validate exactly like walls (they ARE walls); this list is
  // only the durability fact, sorted the same way so it is comparable by value.
  const armored = [...armoredCoords.keys()].sort();

  return { cells, walls, cracked: [], armored };
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

/**
 * Every plate still standing — intact (`walls`) and cracked (`cracked`). Anything
 * that must treat a cracked plate as a plate (bounds, the shaft grid, the view,
 * the collapse scan) reads THIS, never `board.walls`, because a cracked plate is
 * no longer in `walls`.
 */
export function boardPlates(board: Board): readonly CellId[] {
  return [...board.walls, ...board.cracked];
}

/** Is this plate armored — a map-authored 2-hit plate? Durability is a MAP fact. */
export function isArmoredPlate(board: Board, id: CellId): boolean {
  return board.armored.includes(id);
}

/** Has this plate already taken its first hit? Only an armored plate ever can be. */
export function isCrackedPlate(board: Board, id: CellId): boolean {
  return board.cracked.includes(id);
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
  return cell.owner !== null && cell.count === threshold(cell) - 1 && cell.count > 0;
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

  return { ...board, cells: next };
}

export function replaceCell(
  board: Board,
  id: CellId,
  patch: Pick<CellState, 'count' | 'owner'>,
): Board {
  const cell = getCell(board, id);
  return {
    ...board,
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

/**
 * Position signature. EVERY piece of board state enters it — cells, intact plates
 * (`#w`), cracked plates (`#x`) and the map-authored armor (`#a`) — so two boards
 * that differ in ANY of them are different positions to the cascade's repeat
 * guard. Dropping a term makes the guard blind to that difference.
 */
export function hashBoard(board: Board): string {
  const cells = Object.keys(board.cells)
    .sort()
    .map((id) => {
      const cell = getCell(board, id as CellId);
      return `${id}:${cell.owner ?? '-'}:${cell.count}`;
    })
    .join('|');
  const walls = [...board.walls].sort().join(',');
  const cracked = [...board.cracked].sort().join(',');
  const armored = [...board.armored].sort().join(',');
  return `${cells}|#w:${walls}|#x:${cracked}|#a:${armored}`;
}

export type WallDamage = {
  readonly board: Board;
  /** Plates that took their LAST hit: now empty, unowned, plain cells. */
  readonly collapsed: readonly CellId[];
  /** Plates that took their FIRST hit: now cracked, and still plates. */
  readonly cracked: readonly CellId[];
};

/**
 * Applies ONE wave's damage to every plate that blast touches. Adjacency is
 * unchanged: orthogonal to any exploded cell, or diagonal to an exploded DEEP cell.
 * DAMAGE IS ONE PER WAVE: a plate touched in both ways — or by several exploded
 * cells — is hit exactly once, so a 2-hit plate can never fall to a single wave.
 * An intact 1-hit plate falls; an intact armored plate cracks; a cracked armored
 * plate falls. A fallen plate becomes today's empty unowned plain cell and the
 * graph is rewired exactly as before; cracking changes no cell and no edge.
 */
export function collapseWalls(board: Board, exploded: readonly CellId[]): WallDamage {
  const plates = boardPlates(board);
  if (exploded.length === 0 || plates.length === 0) {
    return { board, collapsed: [], cracked: [] };
  }

  const explodedSet = new Set(exploded);
  const newlyCracked: CellId[] = [];
  const falling: CellId[] = [];
  for (const plateId of plates) {
    const pos = parseCellId(plateId);
    const touched =
      orthoNeighborIds(pos.x, pos.y).some((neighbor) => explodedSet.has(neighbor)) ||
      diagNeighborIds(pos.x, pos.y).some(
        (neighbor) => explodedSet.has(neighbor) && board.cells[neighbor]?.deep === true,
      );
    if (!touched) {
      continue;
    }
    if (isArmoredPlate(board, plateId) && !isCrackedPlate(board, plateId)) {
      newlyCracked.push(plateId);
    } else {
      falling.push(plateId);
    }
  }
  newlyCracked.sort();
  falling.sort();
  if (newlyCracked.length === 0 && falling.length === 0) {
    return { board, collapsed: [], cracked: [] };
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
      diagonals: [],
      deep: false,
      count: 0,
      owner: null,
    };
  }
  // `walls` holds INTACT plates only, so a plate that just cracked leaves it too —
  // it is still a plate, but `cracked` is now the list that says so.
  const leftWalls = new Set([...falling, ...newlyCracked]);

  return {
    board: {
      cells: falling.length === 0 ? board.cells : rewireCells(cells),
      walls: board.walls.filter((id) => !leftWalls.has(id)),
      cracked: [...board.cracked.filter((id) => !fallSet.has(id)), ...newlyCracked].sort(),
      armored: board.armored,
    },
    collapsed: falling,
    cracked: newlyCracked,
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
  // A cracked plate still bounds the map: it occupies its square until it falls.
  for (const plateId of boardPlates(board)) {
    const pos = parseCellId(plateId);
    visit(pos.x, pos.y);
  }
  return { minX, maxX, minY, maxY };
}
