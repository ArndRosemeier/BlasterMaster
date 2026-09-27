import { describe, expect, it } from 'vitest';
import { SPARK, mapFromRows } from '../maps';
import { createBoard, seedBoard } from '../engine/board';
import { applyTurn, createGame } from '../engine/game';
import { cellId } from '../engine/ids';
import type {
  Board,
  CellId,
  Game,
  MapDefinition,
  PlayerId,
  TokenSeed,
  TurnResult,
  TurnSuccess,
} from '../engine/types';
import { mulberry32 } from '../../lib/rng';
import { chooseAiMove } from './choose';
import { evaluatePosition } from './evaluate';

const LINE2: MapDefinition = mapFromRows('line2', 'line2', ['##']);

const GRID3: MapDefinition = mapFromRows('grid3', 'grid3', ['###', '###', '###']);
/** Same 3x3 board with (1,1) deep: threshold 8 instead of 4. */
const GRID3_DEEP_CENTRE: MapDefinition = mapFromRows('grid3dc', 'grid3dc', [
  '###',
  '#*#',
  '###',
]);
/** Same 3x3 board with the (2,0) corner deep: threshold 3 instead of 2. */
const GRID3_DEEP_CORNER: MapDefinition = mapFromRows('grid3dk', 'grid3dk', [
  '##*',
  '###',
  '###',
]);

function seeded(map: MapDefinition, id: CellId, count: number, owner: PlayerId): Board {
  return seedBoard(createBoard(map), [{ id, count, owner }]);
}

function seededGame(map: MapDefinition, seeds: readonly TokenSeed[]): Game {
  return {
    mapId: map.id,
    board: seedBoard(createBoard(map), seeds),
    currentPlayer: 'a',
    hasPlaced: { a: true, b: true },
    outcome: { type: 'ongoing' },
  };
}

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

  it('values the same token count lower on a deep cell than on a plain one', () => {
    // PIN: rule-derived valuation. (1,1) is the only difference between the two
    // maps, and the two boards are identical otherwise. The rule says a deep
    // centre detonates at 8, not 4, so the same count is further from firing and
    // must be worth less to its owner. The base hardcoded-feature judgement
    // scored both boards identically (neither count is near-critical), so this
    // test is RED if the judgement stops deriving from `threshold`.
    const centre = cellId(1, 1);
    for (const count of [1, 2, 3]) {
      const plain = evaluatePosition(seeded(GRID3, centre, count, 'a'), 'a', {
        type: 'ongoing',
      });
      const deep = evaluatePosition(seeded(GRID3_DEEP_CENTRE, centre, count, 'a'), 'a', {
        type: 'ongoing',
      });
      expect(deep).not.toBe(plain);
      expect(deep).toBeLessThan(plain);
    }
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

  it('lets a deep cell change which move it picks', () => {
    // PIN: rule sensitivity. Same seeds, same 3x3 board; only (2,0) is deep in
    // the second game (threshold 3 instead of 2). The base hardcoded-feature
    // judgement picked (0,0) on BOTH boards — it could not see the difference —
    // so this test is RED if the judgement stops deriving from the rule.
    const seeds: readonly TokenSeed[] = [
      { id: cellId(1, 0), count: 2, owner: 'b' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
      { id: cellId(2, 1), count: 2, owner: 'a' },
    ];
    const plain = seededGame(GRID3, seeds);
    const deep = seededGame(GRID3_DEEP_CORNER, seeds);
    expect(chooseAiMove(plain, 'operator', mulberry32(1))).toBe(cellId(2, 1));
    expect(chooseAiMove(deep, 'operator', mulberry32(1))).toBe(cellId(0, 0));
  });
});

function must(result: TurnResult): TurnSuccess {
  if (!result.ok) {
    throw new Error('expected ok');
  }
  return result;
}
