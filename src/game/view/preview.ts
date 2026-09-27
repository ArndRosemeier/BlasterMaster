import { getCell } from '../engine/board';
import { applyMove } from '../engine/move';
import type { CellId, Game } from '../engine/types';

/**
 * Where an eater will eat NEXT, from the same simulation as the dumps: `to` is the
 * square it will move onto (`from` when it has nothing beside it to eat), `ate` is
 * the stack it takes with it, and `detonated` says whether that bite ends it.
 */
export type EaterMove = {
  readonly from: CellId;
  readonly to: CellId;
  readonly ate: number;
  readonly detonated: boolean;
};

export type PlacementPreview = {
  readonly explodes: boolean;
  readonly leftover: number;
  readonly dumps: readonly CellId[];
  /** Plates this wave drops: the last hit of a plate's life. */
  readonly collapsed: readonly CellId[];
  /** Plates this wave only cracks: armored plates that survive the hit. */
  readonly cracked: readonly CellId[];
  /** Every eater this placement will move, in the order their phase runs them. */
  readonly eaterMoves: readonly EaterMove[];
};

export function previewPlacement(game: Game, target: CellId): PlacementPreview | null {
  const result = applyMove(game.board, game.currentPlayer, target, game.hasPlaced);
  if (!result.ok) {
    return null;
  }
  const eaterMoves = result.eaters.map((step) => ({
    from: step.from,
    to: step.to,
    ate: step.ate,
    detonated: step.detonated,
  }));
  const first = result.waves[0];
  if (first === undefined) {
    return {
      explodes: false,
      leftover: getCell(result.afterPlacement, target).count,
      dumps: [],
      collapsed: [],
      cracked: [],
      eaterMoves,
    };
  }
  return {
    explodes: first.exploded.includes(target),
    leftover: getCell(first.board, target).count,
    dumps: first.transfers.filter((transfer) => transfer.from === target).map((transfer) => transfer.to),
    collapsed: first.collapsed,
    cracked: first.cracked,
    eaterMoves,
  };
}
