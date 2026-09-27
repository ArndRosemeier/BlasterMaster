import { legalMoves } from '../engine/board';
import { applyTurn } from '../engine/game';
import type { CellId, Game } from '../engine/types';
import { evaluatePosition } from './evaluate';

export const AI_DIFFICULTIES = ['cadet', 'operator', 'director'] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];

export function isAiDifficulty(value: string): value is AiDifficulty {
  return (AI_DIFFICULTIES as readonly string[]).includes(value);
}

function requireLegal(game: Game): readonly CellId[] {
  if (game.outcome.type !== 'ongoing') {
    throw new Error('chooseAiMove called after the match ended');
  }
  const moves = legalMoves(game.board, game.currentPlayer);
  if (moves.length === 0) {
    throw new Error('chooseAiMove found no legal moves');
  }
  return moves;
}

function scoreOwnMove(game: Game, move: CellId, lookahead: 0 | 1): number {
  const result = applyTurn(game, move);
  if (!result.ok) {
    throw new Error(`AI simulated an illegal move ${move}`);
  }
  const actor = game.currentPlayer;
  const immediate = evaluatePosition(result.game.board, actor, result.game.outcome);
  if (lookahead === 0 || result.game.outcome.type !== 'ongoing') {
    return immediate;
  }

  const replies = legalMoves(result.game.board, result.game.currentPlayer);
  if (replies.length === 0) {
    throw new Error('Opponent has no legal replies during AI lookahead');
  }
  let worst = Number.POSITIVE_INFINITY;
  for (const reply of replies) {
    const answered = applyTurn(result.game, reply);
    if (!answered.ok) {
      throw new Error(`AI simulated an illegal reply ${reply}`);
    }
    const score = evaluatePosition(answered.game.board, actor, answered.game.outcome);
    if (score < worst) {
      worst = score;
    }
  }
  return worst;
}

function pickBest(moves: readonly CellId[], scores: readonly number[]): CellId {
  let bestScore = Number.NEGATIVE_INFINITY;
  let best: CellId | undefined;
  moves.forEach((move, index) => {
    const score = scores[index];
    if (score === undefined) {
      throw new Error('AI score list drifted from move list');
    }
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  });
  if (best === undefined) {
    throw new Error('AI failed to select a move');
  }
  return best;
}

function pickAmongTop(moves: readonly CellId[], scores: readonly number[], random: () => number, keep: number): CellId {
  const ranked = moves
    .map((move, index) => {
      const score = scores[index];
      if (score === undefined) {
        throw new Error('AI score list drifted from move list');
      }
      return { move, score };
    })
    .sort((left, right) => right.score - left.score);
  const slice = ranked.slice(0, Math.min(keep, ranked.length));
  const choice = slice[Math.floor(random() * slice.length)];
  if (choice === undefined) {
    throw new Error('AI cadet pool was empty');
  }
  return choice.move;
}

export function chooseAiMove(game: Game, difficulty: AiDifficulty, random: () => number): CellId {
  const moves = requireLegal(game);
  const lookahead: 0 | 1 = difficulty === 'director' ? 1 : 0;
  const scores = moves.map((move) => scoreOwnMove(game, move, lookahead));
  if (difficulty === 'cadet') {
    return pickAmongTop(moves, scores, random, 3);
  }
  return pickBest(moves, scores);
}
