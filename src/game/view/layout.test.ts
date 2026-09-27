import { describe, expect, it } from 'vitest';
import { createBoard, getCell } from '../engine/board';
import { cellId } from '../engine/ids';
import type { CellId } from '../engine/types';
import { cellsFromRows, mapFromRows } from '../maps';
import { CANVAS_WIDTH } from '../theme';
import { cardGrid, cellCenter, layoutBoard, orbOffsets, reachPips } from './layout';

describe('layoutBoard', () => {
  it('centers a 2x2 inside the given area', () => {
    const board = createBoard({
      id: 'sq',
      name: 'sq',
      cells: cellsFromRows(['##', '##']),
      walls: [],
      deep: [],
    });
    const layout = layoutBoard(board, { x: 0, y: 0, width: 400, height: 400 });
    const a = cellCenter(layout, 0, 0);
    const b = cellCenter(layout, 1, 1);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
    expect(layout.cellSize).toBeGreaterThan(20);
    expect(board.cells[cellId(0, 0)]).toBeDefined();
  });
});

describe('cardGrid', () => {
  const legacy = { firstX: 230, topY: 258, pitchX: 310, pitchY: 142, centerX: CANVAS_WIDTH / 2 };

  it('reproduces the original nine-map 3x3 grid exactly', () => {
    const placements = cardGrid(9, 3, legacy);
    expect(placements[0]).toEqual({ x: 230, y: 258 });
    expect(placements[2]).toEqual({ x: 850, y: 258 });
    expect(placements[4]).toEqual({ x: 540, y: 400 });
    expect(placements[8]).toEqual({ x: 850, y: 542 });
  });

  it('keeps a ten-map grid on screen and centers the short last row', () => {
    const placements = cardGrid(10, 4, {
      firstX: 175,
      topY: 258,
      pitchX: 310,
      pitchY: 142,
      centerX: CANVAS_WIDTH / 2,
    });
    expect(placements).toHaveLength(10);
    for (const place of placements) {
      expect(place.x - 148).toBeGreaterThanOrEqual(0);
      expect(place.x + 148).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(place.y + 64).toBeLessThan(650);
    }
    expect(placements[8]).toEqual({ x: 485, y: 542 });
    expect(placements[9]).toEqual({ x: 795, y: 542 });
  });
});

describe('reachPips', () => {
  const SIZE = 100;
  const board = createBoard(mapFromRows('pip-arena', 'pip-arena', ['###', '#*#', '###']));

  function positions(id: CellId): readonly { x: number; y: number }[] {
    return reachPips(getCell(board, id), SIZE).map((pip) => ({ x: pip.x, y: pip.y }));
  }

  it('gives a plain cell one pip per orthogonal edge, never a corner', () => {
    expect(positions(cellId(0, 0))).toEqual([
      { x: 36, y: 0 },
      { x: 0, y: 36 },
    ]);
    const edge = positions(cellId(0, 1));
    expect(edge).toEqual([
      { x: 0, y: -36 },
      { x: 36, y: 0 },
      { x: 0, y: 36 },
    ]);
    for (const pip of edge) {
      expect(Math.abs(pip.x) === Math.abs(pip.y)).toBe(false);
    }
  });

  it('gives a deep cell the four corners as well, so pips equal its threshold', () => {
    const heart = positions(cellId(1, 1));
    expect(heart).toHaveLength(8);
    const diagonals = heart.filter((pip) => Math.abs(pip.x) === Math.abs(pip.y));
    expect(diagonals).toHaveLength(4);
    expect(diagonals.map((pip) => Math.sign(pip.x) * Math.sign(pip.y))).toEqual([-1, 1, -1, 1]);
    for (const pip of diagonals) {
      expect(Math.abs(pip.x)).toBeCloseTo(28.5, 6);
      expect(Math.abs(pip.y)).toBeCloseTo(28.5, 6);
    }
  });
});

describe('orbOffsets', () => {
  it('places one to four cores in distinct slots', () => {
    expect(orbOffsets(0, 8)).toEqual([]);
    expect(orbOffsets(1, 8)).toHaveLength(1);
    expect(orbOffsets(4, 8)).toHaveLength(4);
    expect(orbOffsets(7, 8)).toHaveLength(4);
  });
});
