import { nearCriticalCount, occupiedCount, tokenCount } from '../engine/board';
import { opponentOf } from '../engine/ids';
import type { Board, Outcome, PlayerId } from '../engine/types';

const WIN = 100_000;
const DRAW = 0;

export function evaluatePosition(board: Board, player: PlayerId, outcome: Outcome): number {
  if (outcome.type === 'win') {
    return outcome.player === player ? WIN : -WIN;
  }
  if (outcome.type === 'draw') {
    return DRAW;
  }

  const foe = opponentOf(player);
  return (
    occupiedCount(board, player) * 14 -
    occupiedCount(board, foe) * 16 +
    tokenCount(board, player) * 4 -
    tokenCount(board, foe) * 3 +
    nearCriticalCount(board, player) * 3 -
    nearCriticalCount(board, foe) * 6
  );
}
