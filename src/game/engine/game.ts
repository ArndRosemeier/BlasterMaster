import { createBoard } from './board';
import { opponentOf } from './ids';
import { applyMove } from './move';
import type { CellId, Game, MapDefinition, TurnResult } from './types';

export function createGame(map: MapDefinition): Game {
  return {
    mapId: map.id,
    board: createBoard(map),
    currentPlayer: 'a',
    hasPlaced: { a: false, b: false },
    outcome: { type: 'ongoing' },
  };
}

export function applyTurn(game: Game, target: CellId): TurnResult {
  if (game.outcome.type !== 'ongoing') {
    return { ok: false, reason: 'game-over' };
  }

  const result = applyMove(game.board, game.currentPlayer, target, game.hasPlaced);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    afterPlacement: result.afterPlacement,
    waves: result.waves,
    game: {
      mapId: game.mapId,
      board: result.final,
      currentPlayer:
        result.outcome.type === 'ongoing' ? opponentOf(game.currentPlayer) : game.currentPlayer,
      hasPlaced: result.hasPlaced,
      outcome: result.outcome,
    },
  };
}
