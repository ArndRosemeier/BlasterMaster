import { getCell } from '../engine/board';
import { applyMove } from '../engine/move';
import type { CellId, Game } from '../engine/types';

export type PlacementPreview = {
  readonly explodes: boolean;
  readonly leftover: number;
  readonly dumps: readonly CellId[];
  readonly collapsed: readonly CellId[];
};

export function previewPlacement(game: Game, target: CellId): PlacementPreview | null {
  const result = applyMove(game.board, game.currentPlayer, target, game.hasPlaced);
  if (!result.ok) {
    return null;
  }
  const first = result.waves[0];
  if (first === undefined) {
    return {
      explodes: false,
      leftover: getCell(result.afterPlacement, target).count,
      dumps: [],
      collapsed: [],
    };
  }
  return {
    explodes: first.exploded.includes(target),
    leftover: getCell(first.board, target).count,
    dumps: first.transfers.filter((transfer) => transfer.from === target).map((transfer) => transfer.to),
    collapsed: first.collapsed,
  };
}
