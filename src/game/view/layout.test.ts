import { describe, expect, it } from 'vitest';
import { createBoard } from '../engine/board';
import { cellId } from '../engine/ids';
import { cellsFromRows } from '../maps';
import { cellCenter, layoutBoard, orbOffsets } from './layout';

describe('layoutBoard', () => {
  it('centers a 2x2 inside the given area', () => {
    const board = createBoard({
      id: 'sq',
      name: 'sq',
      cells: cellsFromRows(['##', '##']),
      walls: [],
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

describe('orbOffsets', () => {
  it('places one to four cores in distinct slots', () => {
    expect(orbOffsets(0, 8)).toEqual([]);
    expect(orbOffsets(1, 8)).toHaveLength(1);
    expect(orbOffsets(4, 8)).toHaveLength(4);
    expect(orbOffsets(7, 8)).toHaveLength(4);
  });
});
