import {
  blastTargets,
  collapseWalls,
  getCell,
  hashBoard,
  isCritical,
  occupiedCount,
  replaceCell,
  threshold,
} from './board';
import { opponentOf } from './ids';
import type {
  Board,
  CellId,
  CellState,
  HasPlaced,
  MoveResult,
  Outcome,
  PlayerId,
  TokenTransfer,
  WaveStep,
} from './types';

function criticalCells(board: Board): CellId[] {
  const ready: CellId[] = [];
  for (const cell of Object.values(board.cells)) {
    if (isCritical(cell)) {
      ready.push(cell.id);
    }
  }
  return ready.sort();
}

function applyWave(
  board: Board,
  player: PlayerId,
  exploded: readonly CellId[],
): { readonly board: Board; readonly transfers: readonly TokenTransfer[] } {
  const cells: Record<CellId, CellState> = { ...board.cells };
  const transfers: TokenTransfer[] = [];

  for (const id of exploded) {
    const cell = getCell({ cells, walls: board.walls }, id);
    const leftover = cell.count - threshold(cell);
    if (leftover < 0) {
      throw new Error(`Cell ${id} exploded below zero`);
    }
    cells[id] = {
      ...cell,
      count: leftover,
      owner: leftover === 0 ? null : cell.owner,
    };
    for (const to of blastTargets(cell)) {
      transfers.push({ from: id, to });
    }
  }

  for (const transfer of transfers) {
    const target = getCell({ cells, walls: board.walls }, transfer.to);
    cells[transfer.to] = {
      ...target,
      count: target.count + 1,
      owner: player,
    };
  }

  return {
    board: { cells, walls: board.walls },
    transfers,
  };
}

function cycleOutcome(board: Board): Outcome {
  const aCount = occupiedCount(board, 'a');
  const bCount = occupiedCount(board, 'b');
  if (aCount === bCount) {
    return { type: 'draw' };
  }
  return { type: 'win', player: aCount > bCount ? 'a' : 'b', cause: 'cycle' };
}

export function applyMove(
  board: Board,
  player: PlayerId,
  target: CellId,
  hasPlaced: HasPlaced,
): MoveResult {
  const cell = board.cells[target];
  if (cell === undefined) {
    return { ok: false, reason: 'unknown-cell' };
  }
  if (cell.owner !== null && cell.owner !== player) {
    return { ok: false, reason: 'owned-by-opponent' };
  }

  const nextHasPlaced: HasPlaced = {
    a: hasPlaced.a || player === 'a',
    b: hasPlaced.b || player === 'b',
  };

  let current = replaceCell(board, target, {
    count: cell.count + 1,
    owner: player,
  });
  const afterPlacement = current;
  const seen = new Set<string>([hashBoard(current)]);
  const waves: WaveStep[] = [];

  for (;;) {
    const exploded = criticalCells(current);
    if (exploded.length === 0) {
      return {
        ok: true,
        afterPlacement,
        waves,
        final: current,
        hasPlaced: nextHasPlaced,
        outcome: { type: 'ongoing' },
      };
    }

    const dump = applyWave(current, player, exploded);
    const grown = collapseWalls(dump.board, exploded);
    current = grown.board;
    waves.push({
      board: current,
      exploded,
      transfers: dump.transfers,
      collapsed: grown.collapsed,
    });

    const opponent = opponentOf(player);
    if (occupiedCount(current, opponent) === 0 && nextHasPlaced[opponent]) {
      return {
        ok: true,
        afterPlacement,
        waves,
        final: current,
        hasPlaced: nextHasPlaced,
        outcome: { type: 'win', player, cause: 'wipe' },
      };
    }

    const signature = hashBoard(current);
    if (seen.has(signature)) {
      const outcome: Outcome = nextHasPlaced[opponent]
        ? cycleOutcome(current)
        : { type: 'ongoing' };
      return {
        ok: true,
        afterPlacement,
        waves,
        final: current,
        hasPlaced: nextHasPlaced,
        outcome,
      };
    }
    seen.add(signature);
  }
}
