import { describe, expect, it } from 'vitest';
import { applyTurn, createGame } from '../engine/game';
import { cellId } from '../engine/ids';
import { mapFromRows } from '../maps';
import { addTurn, awardStars, emptyStats } from './stats';
import type { MapDefinition } from '../engine/types';

const LINE2: MapDefinition = mapFromRows('line2', 'line2', ['##']);

describe('match stats and stars', () => {
  it('counts waves and awards hold + cascade on a two-move wipe', () => {
    let game = createGame(LINE2);
    let stats = emptyStats();
    const first = applyTurn(game, cellId(0, 0));
    if (!first.ok) {
      throw new Error('first move failed');
    }
    stats = addTurn(stats, first);
    game = first.game;
    const second = applyTurn(game, cellId(1, 0));
    if (!second.ok) {
      throw new Error('second move failed');
    }
    stats = addTurn(stats, second);
    expect(stats.moves).toBe(2);
    expect(stats.maxChain).toBeGreaterThanOrEqual(1);
    expect(awardStars(second.game.outcome, stats, { swiftMoves: 4, cascadeWaves: 1 })).toEqual({
      earned: ['hold', 'swift', 'cascade'],
    });
    expect(awardStars({ type: 'draw' }, stats, { swiftMoves: 4, cascadeWaves: 1 })).toEqual({
      earned: [],
    });
  });
});
