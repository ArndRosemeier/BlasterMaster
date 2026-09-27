import { describe, expect, it } from 'vitest';
import { SPARK, mapFromRows } from '../maps';
import { applyTurn, createGame } from '../engine/game';
import { cellId } from '../engine/ids';
import type { MapDefinition, TurnResult, TurnSuccess } from '../engine/types';
import { mulberry32 } from '../../lib/rng';
import { chooseAiMove } from './choose';
import { evaluatePosition } from './evaluate';

const LINE2: MapDefinition = mapFromRows('line2', 'line2', ['##']);

describe('evaluatePosition', () => {
  it('scores a win above an ongoing board', () => {
    let game = createGame(LINE2);
    const first = applyTurn(game, cellId(0, 0));
    if (!first.ok) {
      throw new Error('setup failed');
    }
    game = first.game;
    const win = applyTurn(game, cellId(1, 0));
    if (!win.ok) {
      throw new Error('win setup failed');
    }
    expect(evaluatePosition(win.game.board, 'b', win.game.outcome)).toBeGreaterThan(
      evaluatePosition(first.game.board, 'b', first.game.outcome),
    );
  });
});

describe('chooseAiMove', () => {
  it('takes the finishing wipe on a two-cell line', () => {
    let game = createGame(LINE2);
    const first = applyTurn(game, cellId(0, 0));
    if (!first.ok) {
      throw new Error('setup failed');
    }
    game = first.game;
    const pick = chooseAiMove(game, 'operator', mulberry32(1));
    expect(pick).toBe(cellId(1, 0));
    const played = applyTurn(game, pick);
    if (!played.ok) {
      throw new Error('AI move was illegal');
    }
    expect(played.game.outcome).toEqual({ type: 'win', player: 'b', cause: 'wipe' });
  });

  it('always returns a legal cell for cadet noise', () => {
    const game = createGame(LINE2);
    const pick = chooseAiMove(game, 'cadet', mulberry32(99));
    expect([cellId(0, 0), cellId(1, 0)]).toContain(pick);
  });

  it('two operators always finish SPARK', () => {
    let game = createGame(SPARK);
    const rng = mulberry32(2026);
    let moves = 0;
    while (game.outcome.type === 'ongoing' && moves < 80) {
      const pick = chooseAiMove(game, 'operator', rng);
      game = must(applyTurn(game, pick)).game;
      moves += 1;
    }
    expect(game.outcome.type).not.toBe('ongoing');
    expect(moves).toBeGreaterThan(2);
  });

  it('throws after the match is over', () => {
    let game = createGame(LINE2);
    game = must(applyTurn(game, cellId(0, 0))).game;
    game = must(applyTurn(game, cellId(1, 0))).game;
    expect(() => chooseAiMove(game, 'director', mulberry32(2))).toThrow(/after the match ended/);
  });
});

function must(result: TurnResult): TurnSuccess {
  if (!result.ok) {
    throw new Error('expected ok');
  }
  return result;
}
