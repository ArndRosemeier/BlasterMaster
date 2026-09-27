import { createBoard, legalMoves } from './board';
import { opponentOf } from './ids';
import { applyMove } from './move';
import type { CellId, Game, MapDefinition, Outcome, TurnResult } from './types';

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

  const nextPlayer =
    result.outcome.type === 'ongoing' ? opponentOf(game.currentPlayer) : game.currentPlayer;

  // THE STALEMATE RULE (owner's ruling, 2026-09-27): a player with no legal move owns no
  // ground and has nowhere to stand, so they LOSE. Without this the game cannot end in a
  // state the eater can create — it empties a player's squares while every other square is
  // owned or neutral, so EVERY target for that player is illegal and no move can resolve it.
  // `legalMoves` is the engine's own predicate: this adds no second definition of "can move".
  //
  // The `hasPlaced` guard mirrors the wipe rule's opening-bounce protection, so a player who
  // has never placed cannot lose this way and one cascade cannot end a game on a map small
  // enough to be swallowed whole. On any shipped map the eater-caused stalemate always
  // happens after both players have placed.
  const stuck = result.hasPlaced[nextPlayer] && legalMoves(result.final, nextPlayer).length === 0;
  const outcome: Outcome =
    result.outcome.type === 'ongoing' && stuck
      ? { type: 'win', player: game.currentPlayer, cause: 'wipe' }
      : result.outcome;

  return {
    ok: true,
    afterPlacement: result.afterPlacement,
    waves: result.waves,
    eaters: result.eaters,
    game: {
      mapId: game.mapId,
      board: result.final,
      currentPlayer: outcome.type === 'ongoing' ? nextPlayer : game.currentPlayer,
      hasPlaced: result.hasPlaced,
      outcome,
    },
  };
}
