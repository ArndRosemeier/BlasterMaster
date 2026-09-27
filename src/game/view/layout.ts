import { blastTargets, boardCells, mapBounds } from '../engine/board';
import { cellId } from '../engine/ids';
import type { Board, CellId, CellState, MapDefinition } from '../engine/types';
import type { Mission } from '../ops/campaign';
import { CANVAS_WIDTH } from '../theme';

export type BoardArea = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type BoardLayout = {
  readonly cellSize: number;
  readonly gap: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly originX: number;
  readonly originY: number;
};

export function layoutBoard(board: Board, area: BoardArea): BoardLayout {
  const bounds = mapBounds(board);
  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;
  const gap = Math.max(6, Math.min(14, Math.floor(Math.min(area.width, area.height) / 48)));
  const cellSize = Math.min(
    (area.width - gap * (cols + 1)) / cols,
    (area.height - gap * (rows + 1)) / rows,
  );
  if (cellSize <= 0) {
    throw new Error('Board area is too small to layout cells');
  }
  const usedW = cols * cellSize + (cols + 1) * gap;
  const usedH = rows * cellSize + (rows + 1) * gap;
  return {
    cellSize,
    gap,
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
    originX: area.x + (area.width - usedW) / 2 + gap,
    originY: area.y + (area.height - usedH) / 2 + gap,
  };
}

export function cellCenter(layout: BoardLayout, x: number, y: number): { x: number; y: number } {
  return {
    x: layout.originX + (x - layout.minX) * (layout.cellSize + layout.gap) + layout.cellSize / 2,
    y: layout.originY + (y - layout.minY) * (layout.cellSize + layout.gap) + layout.cellSize / 2,
  };
}

export function cellCenterById(board: Board, layout: BoardLayout, id: CellId): { x: number; y: number } {
  const match = boardCells(board).find((cell) => cell.id === id);
  if (match === undefined) {
    throw new Error(`Cannot layout unknown cell ${id}`);
  }
  return cellCenter(layout, match.x, match.y);
}

export type GridPlacement = { readonly x: number; readonly y: number };

export type CardGridOptions = {
  /** Center x of the first column. */
  readonly firstX: number;
  readonly topY: number;
  readonly pitchX: number;
  readonly pitchY: number;
  /** Used to center a short final row; pass the canvas or panel center. */
  readonly centerX: number;
};

/**
 * Places menu cards in a left-anchored grid. Full rows start at `firstX`; a short
 * last row is centered on `centerX` so an odd count stays balanced. With `count`
 * divisible by `cols` this reproduces the plain `firstX + col * pitchX` grid.
 */
export function cardGrid(
  count: number,
  cols: number,
  options: CardGridOptions,
): readonly GridPlacement[] {
  const placements: GridPlacement[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const inRow = Math.min(cols, count - row * cols);
    const rowFirstX =
      inRow === cols ? options.firstX : options.centerX - ((inRow - 1) * options.pitchX) / 2;
    placements.push({
      x: rowFirstX + (index % cols) * options.pitchX,
      y: options.topY + row * options.pitchY,
    });
  }
  return placements;
}

/**
 * A title panel keeps three card columns until a fourth row would land under the
 * BACK panel; from ten cards on it takes a fourth column instead. ONE home for
 * that rule, shared by the OPERATIONS and SKIRMISH panels.
 */
export function menuColumns(count: number): number {
  return count > 9 ? 4 : 3;
}

/**
 * A title panel's card grid: `cardGrid` with the panels' own arguments, never a
 * second placement implementation. Both panels start at x=230 for three columns
 * (the legacy coordinates, unchanged) and x=175 for four.
 */
export function menuGrid(count: number, topY: number): readonly GridPlacement[] {
  const cols = menuColumns(count);
  return cardGrid(count, cols, {
    firstX: cols === 4 ? 175 : 230,
    topY,
    pitchX: 310,
    pitchY: 142,
    centerX: CANVAS_WIDTH / 2,
  });
}

export type MapCardText = {
  /** The counts line: cells, standing plates, deep cells, armored plates. */
  readonly counts: string;
  /** The reveal RULE, named on every map whose plates can fall; empty otherwise. */
  readonly reveal: string;
};

/**
 * The skirmish card's text. A plate count alone taught the wrong expectation (a
 * fallen plate used to read as an empty square), so a map with plates names the
 * REVEAL RULE on its card: every plate that falls frees an eater. It is a RULE and
 * not a map fact, so it is the same line wherever the rule can apply — there is no
 * housing-vs-armored distinction left to draw.
 */
export function mapCardText(map: MapDefinition): MapCardText {
  const wallLine =
    map.walls.length > 0
      ? ` · ${map.walls.length} ${map.walls.length === 1 ? 'PLATE' : 'PLATES'}`
      : '';
  const deepLine = map.deep.length > 0 ? ` · ${map.deep.length} DEEP` : '';
  const armorLine = map.armored.length > 0 ? ` · ${map.armored.length} ARMORED` : '';
  return {
    counts: `${map.cells.length} CELLS${wallLine}${deepLine}${armorLine}`,
    reveal: map.walls.length > 0 ? 'EVERY FALL FREES AN EATER' : '',
  };
}

/**
 * The mission card's lower line: the difficulty tier, plus the mechanic this
 * mission FIRST introduces. A mission that teaches nothing shows its tier alone —
 * one line, so the brief tag never competes for card height with the title,
 * dossier or star line.
 */
export function missionCardTag(mission: Mission): string {
  const tier = mission.difficulty.toUpperCase();
  return mission.brief === undefined ? tier : `${tier}  ·  ${mission.brief.title}`;
}

export type MissionIntro = {
  /** The banner flashed ONCE when the board opens; null when there is no brief. */
  readonly banner: string | null;
  /** The coach line shown before the first move; the ordinary coach returns after it. */
  readonly line: string;
};

/**
 * What a mission says at the moment the player meets it. A mission carrying a
 * mechanic brief names it on the banner and states the rule on the coach line; a
 * mission that introduces nothing keeps its ordinary coach line, so the per-turn
 * coach/footer flow is untouched.
 */
export function missionIntro(mission: Mission): MissionIntro {
  if (mission.brief === undefined) {
    return { banner: null, line: mission.coach };
  }
  return { banner: mission.brief.title, line: `BRIEF  ·  ${mission.brief.text}` };
}

/** Clockwise from north. Offsets are fractions of the cell size. */
const REACH_DIRECTIONS: readonly {
  readonly dx: number;
  readonly dy: number;
  readonly ox: number;
  readonly oy: number;
}[] = [
  { dx: 0, dy: -1, ox: 0, oy: -0.36 },
  { dx: 1, dy: -1, ox: 0.285, oy: -0.285 },
  { dx: 1, dy: 0, ox: 0.36, oy: 0 },
  { dx: 1, dy: 1, ox: 0.285, oy: 0.285 },
  { dx: 0, dy: 1, ox: 0, oy: 0.36 },
  { dx: -1, dy: 1, ox: -0.285, oy: 0.285 },
  { dx: -1, dy: 0, ox: -0.36, oy: 0 },
  { dx: -1, dy: -1, ox: -0.285, oy: -0.285 },
];

export type ReachPip = { readonly id: CellId; readonly x: number; readonly y: number };

/**
 * One gauge pip per outgoing edge, parked on the edge it fires through. Plain
 * cells get their four cardinals; a deep cell also gets the four corners, so the
 * pip count is the threshold and the pip position is the reach.
 */
export function reachPips(cell: CellState, size: number): readonly ReachPip[] {
  const targets = new Set(blastTargets(cell));
  const pips: ReachPip[] = [];
  for (const dir of REACH_DIRECTIONS) {
    const id = cellId(cell.x + dir.dx, cell.y + dir.dy);
    if (!targets.has(id)) {
      continue;
    }
    pips.push({ id, x: dir.ox * size, y: dir.oy * size });
  }
  return pips;
}

/** How many token orbs a cell can show before it falls back to a number. */
export const ORB_SLOTS = 4;

export function orbOffsets(count: number, radius: number): readonly { x: number; y: number }[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ x: 0, y: 0 }];
  }
  if (count === 2) {
    return [
      { x: -radius, y: 0 },
      { x: radius, y: 0 },
    ];
  }
  if (count === 3) {
    return [
      { x: 0, y: -radius * 0.78 },
      { x: -radius, y: radius * 0.52 },
      { x: radius, y: radius * 0.52 },
    ];
  }
  const shown = Math.min(count, ORB_SLOTS);
  const corners = [
    { x: -radius, y: -radius },
    { x: radius, y: -radius },
    { x: -radius, y: radius },
    { x: radius, y: radius },
  ];
  return corners.slice(0, shown);
}
