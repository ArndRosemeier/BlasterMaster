import { hashBoard, occupiedCount, replaceCell } from './board';
import { stepCascade } from './cascade';
import { runEaterPhase } from './eater';
import { opponentOf } from './ids';
import type {
  Board,
  CellId,
  EaterStep,
  HasPlaced,
  MoveResult,
  Outcome,
  PlayerId,
  WaveStep,
} from './types';

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
  const eaters: EaterStep[] = [];
  const opponent = opponentOf(player);
  const finish = (outcome: Outcome): MoveResult => ({
    ok: true,
    afterPlacement,
    waves,
    eaters,
    final: current,
    hasPlaced: nextHasPlaced,
    outcome,
  });

  for (;;) {
    const step = stepCascade(current, player, player, seen);
    if (step.kind === 'stable') {
      break;
    }

    waves.push(step.wave);
    current = step.board;

    // A WIPE IS THE MOVER'S OWN CASCADE, and only a wave the mover's colour
    // carried can award it: a NEUTRAL flood that empties the opponent's squares
    // never wins the game for anyone (the squares were not captured), so those
    // waves are skipped. The eater phase that follows is not checked at all.
    if (
      step.wave.spreader !== 'neutral' &&
      occupiedCount(current, opponent) === 0 &&
      nextHasPlaced[opponent]
    ) {
      return finish({ type: 'win', player, cause: 'wipe' });
    }

    if (step.repeated) {
      if (nextHasPlaced[opponent]) {
        return finish(cycleOutcome(current));
      }
      // The cascade stopped on a repeat, but the TURN is not over: the game goes on
      // (the opponent has never placed), so the eater slot still belongs to it.
      break;
    }
  }

  // THE EATER PHASE: the revealer's slot, immediately after their own cascade.
  const phase = runEaterPhase(current, player);
  current = phase.board;
  waves.push(...phase.waves);
  eaters.push(...phase.eaters);

  // THE TIE: if the phase left NO square owned by either player, nobody can win it
  // and the game is a draw. This is also the safety valve for an all-neutral board.
  if (occupiedCount(current, 'a') === 0 && occupiedCount(current, 'b') === 0) {
    return finish({ type: 'draw' });
  }
  return finish({ type: 'ongoing' });
}
