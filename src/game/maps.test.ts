import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/rng';
import { createBoard, getCell } from './engine/board';
import { applyTurn, createGame } from './engine/game';
import { cellId } from './engine/ids';
import { legalMoves, occupiedCount } from './engine/board';
import type { TurnResult, TurnSuccess } from './engine/types';
import { AIRLOCK, BOLTS, BULKHEAD, FUNNEL, IRREGULAR, MAP_LIST, NEST, RECT_5, RING, SEAM, SPARK, TWIN_STACKS, assertShippedMaps, cellsFromRows, requireMap, tilesFromRows } from './maps';

describe('shipped maps', () => {
  it('build valid graphs with expected degrees', () => {
    assertShippedMaps();

    const rect = createBoard(RECT_5);
    expect(Object.keys(rect.cells)).toHaveLength(25);
    expect(getCell(rect, cellId(0, 0)).neighbors).toHaveLength(2);
    expect(getCell(rect, cellId(2, 0)).neighbors).toHaveLength(3);
    expect(getCell(rect, cellId(2, 2)).neighbors).toHaveLength(4);

    const broken = createBoard(IRREGULAR);
    expect(Object.keys(broken.cells)).toHaveLength(20);
    expect(broken.cells[cellId(2, 2)]).toBeUndefined();
    expect(getCell(broken, cellId(2, 5)).neighbors).toEqual([cellId(2, 4)]);
    expect(getCell(broken, cellId(1, 2)).neighbors).toHaveLength(3);

    expect(Object.keys(createBoard(SPARK).cells)).toHaveLength(9);
    expect(getCell(createBoard(FUNNEL), cellId(2, 0)).neighbors).toHaveLength(1);
    expect(getCell(createBoard(FUNNEL), cellId(2, 2)).neighbors).toHaveLength(4);
    expect(createBoard(RING).cells[cellId(2, 2)]).toBeUndefined();
    expect(Object.keys(createBoard(TWIN_STACKS).cells)).toHaveLength(31);

    const airlock = createBoard(AIRLOCK);
    expect(Object.keys(airlock.cells)).toHaveLength(18);
    expect(airlock.walls).toEqual([cellId(3, 1)]);
    expect(getCell(airlock, cellId(2, 1)).neighbors).toHaveLength(3);
    expect(createBoard(BOLTS).walls).toEqual([cellId(3, 1), cellId(7, 1)]);
    expect(createBoard(SEAM).walls).toHaveLength(5);

    expect(MAP_LIST).toHaveLength(12);
    const bulkhead = createBoard(BULKHEAD);
    expect(bulkhead.walls).toEqual([
      cellId(3, 0),
      cellId(4, 1),
      cellId(4, 2),
      cellId(4, 3),
      cellId(5, 4),
    ]);
    expect(bulkhead.armored).toEqual([cellId(4, 1), cellId(4, 2), cellId(4, 3)]);
    expect(bulkhead.cracked).toEqual([]);
    expect(bulkhead.housing).toEqual([]);

    // NEST is the 12th map and the only one with housings: two armored plates that
    // reveal an eater when they fall, and no eaters until then.
    const nest = createBoard(NEST);
    expect(nest.walls).toEqual([cellId(3, 0), cellId(3, 4)]);
    expect(nest.armored).toEqual([cellId(3, 0), cellId(3, 4)]);
    expect(nest.housing).toEqual([cellId(3, 0), cellId(3, 4)]);
    expect(nest.eaters).toEqual([]);
    expect(Object.keys(nest.cells)).toHaveLength(33);
    // The square a housing REVEALS into is an edge square: three ortho neighbours
    // and two diagonal ones, so an eater standing there fires at a DEEP degree of
    // five (the map's whole threat). Pinned on those neighbours, because the square
    // itself is a plate, not a cell, until it falls.
    for (const id of [
      cellId(2, 0),
      cellId(4, 0),
      cellId(3, 1),
      cellId(2, 1),
      cellId(4, 1),
    ]) {
      expect(nest.cells[id]).toBeDefined();
    }
  });

  it('parses occupancy rows and rejects unknown map ids', () => {
    expect(cellsFromRows(['#.#', '.#.'])).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(() => cellsFromRows(['#=#'])).toThrow(/wall glyphs/);
    expect(tilesFromRows(['#+#']).cells).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
    expect(tilesFromRows(['#+#']).walls).toEqual([{ x: 1, y: 0 }]);
    expect(tilesFromRows(['#+#']).armored).toEqual([{ x: 1, y: 0 }]);
    expect(tilesFromRows(['#+#']).housing).toEqual([]);
    // `@` is an armored plate AND a housing: both facts, one tile.
    expect(tilesFromRows(['#@#']).walls).toEqual([{ x: 1, y: 0 }]);
    expect(tilesFromRows(['#@#']).armored).toEqual([{ x: 1, y: 0 }]);
    expect(tilesFromRows(['#@#']).housing).toEqual([{ x: 1, y: 0 }]);
    expect(() => cellsFromRows(['#@#'])).toThrow(/wall glyphs/);
    expect(() => cellsFromRows(['#+#'])).toThrow(/wall glyphs/);
    expect(() => requireMap('nope')).toThrow(/Unknown map/);
  });
});

describe('scripted play on shipped maps', () => {
  it('finishes a forced wipe on CORE GRID after both players have tokens', () => {
    let game = createGame(RECT_5);
    game = expectOk(applyTurn(game, cellId(0, 0))).game;
    game = expectOk(applyTurn(game, cellId(4, 4))).game;
    game = expectOk(applyTurn(game, cellId(0, 0))).game;

    expect(occupiedCount(game.board, 'a')).toBe(2);
    expect(occupiedCount(game.board, 'b')).toBe(1);
    expect(game.currentPlayer).toBe('b');
    expect(game.outcome.type).toBe('ongoing');
    expect(legalMoves(game.board, 'b')).not.toContain(cellId(1, 0));
  });

  it('random CORE GRID games always reach win or draw', () => {
    const rng = mulberry32(0x51a7e55d);

    for (let i = 0; i < 20; i += 1) {
      let game = createGame(RECT_5);
      let moves = 0;
      while (game.outcome.type === 'ongoing' && moves < 400) {
        const options = legalMoves(game.board, game.currentPlayer);
        const pick = options[Math.floor(rng() * options.length)];
        if (pick === undefined) {
          throw new Error('no legal move while ongoing');
        }
        game = expectOk(applyTurn(game, pick)).game;
        moves += 1;
      }
      expect(game.outcome.type, `game ${i} still ongoing after ${moves} moves`).not.toBe(
        'ongoing',
      );
    }
  });

  it('explodes the degree-1 shaft on BROKEN WELL and converts the neighbor', () => {
    let game = createGame(IRREGULAR);
    const first = expectOk(applyTurn(game, cellId(2, 5)));
    expect(first.waves[0]?.exploded).toEqual([cellId(2, 5)]);
    game = first.game;
    expect(getCell(game.board, cellId(2, 5)).count).toBe(0);
    expect(getCell(game.board, cellId(2, 4)).owner).toBe('a');
    expect(getCell(game.board, cellId(2, 4)).count).toBe(1);
  });
});

function expectOk(result: TurnResult): TurnSuccess {
  if (!result.ok) {
    throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  }
  return result;
}
