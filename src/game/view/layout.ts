import { boardCells, mapBounds } from '../engine/board';
import type { Board, CellId } from '../engine/types';

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
  const shown = Math.min(count, 4);
  const corners = [
    { x: -radius, y: -radius },
    { x: radius, y: -radius },
    { x: -radius, y: radius },
    { x: radius, y: radius },
  ];
  return corners.slice(0, shown);
}
