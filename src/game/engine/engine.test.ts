import { describe, expect, it } from 'vitest';
import { AIRLOCK, mapFromRows } from '../maps';
import { boardCells, createBoard, getCell, hashBoard, legalMoves, occupiedCount, seedBoard, tokenCount } from './board';
import { applyTurn, createGame } from './game';
import { cellId } from './ids';
import { applyMove } from './move';
import type { Board, HasPlaced, MapDefinition, MoveResult, MoveSuccess, PlayerId, TurnResult, TurnSuccess } from './types';

const NEVER_PLACED: HasPlaced = { a: false, b: false };
const BOTH_PLACED: HasPlaced = { a: true, b: true };

function map(id: string, rows: readonly string[]): MapDefinition {
  return mapFromRows(id, id, rows);
}

const LINE2 = map('line2', ['##']);
const SQUARE = map('square', ['##', '##']);
const RECT_2X3 = map('rect2x3', ['###', '###']);
const CYCLE_ARENA = map('cycle-arena', ['##.##', '##.##']);

function ownerOf(board: Board, x: number, y: number): PlayerId | null {
  return getCell(board, cellId(x, y)).owner;
}

function countOf(board: Board, x: number, y: number): number {
  return getCell(board, cellId(x, y)).count;
}

function requireOk(result: MoveResult): MoveSuccess;
function requireOk(result: TurnResult): TurnSuccess;
function requireOk(result: MoveResult | TurnResult): MoveSuccess | TurnSuccess {
  if (!result.ok) {
    throw new Error(`Expected ok move, got ${JSON.stringify(result)}`);
  }
  return result;
}

describe('createBoard', () => {
  it('derives orthogonal neighbors and rejects isolated cells', () => {
    const board = createBoard(SQUARE);
    expect(getCell(board, cellId(0, 0)).neighbors).toEqual([cellId(1, 0), cellId(0, 1)]);
    expect(getCell(board, cellId(1, 1)).neighbors).toHaveLength(2);
    expect(() => createBoard(map('dot', ['#']))).toThrow(/isolated/);
  });

  it('rejects empty maps and duplicate coordinates', () => {
    expect(() => createBoard({ id: 'empty', name: 'empty', cells: [], walls: [] })).toThrow(/no cells/);
    expect(() =>
      createBoard({
        id: 'dup',
        name: 'dup',
        cells: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        walls: [],
      }),
    ).toThrow(/duplicate/);
  });

  it('rejects holes that leave a cell with zero neighbors', () => {
    expect(() => createBoard(map('split', ['#.#']))).toThrow(/isolated/);
  });
});

describe('legalMoves / applyMove rejection', () => {
  it('allows empty and own cells, rejects opponent and missing cells', () => {
    const seeded = seedBoard(createBoard(SQUARE), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'b' },
    ]);

    expect(legalMoves(seeded, 'a')).toEqual([cellId(0, 0), cellId(0, 1), cellId(1, 1)]);
    expect(applyMove(seeded, 'a', cellId(1, 0), NEVER_PLACED)).toEqual({
      ok: false,
      reason: 'owned-by-opponent',
    });
    expect(applyMove(seeded, 'a', cellId(9, 9), NEVER_PLACED)).toEqual({
      ok: false,
      reason: 'unknown-cell',
    });
  });
});

describe('placement without explosion', () => {
  it('claims an empty cell with one token', () => {
    const result = requireOk(applyMove(createBoard(SQUARE), 'a', cellId(0, 0), NEVER_PLACED));
    expect(result.waves).toEqual([]);
    expect(countOf(result.final, 0, 0)).toBe(1);
    expect(ownerOf(result.final, 0, 0)).toBe('a');
    expect(result.outcome).toEqual({ type: 'ongoing' });
    expect(result.hasPlaced).toEqual({ a: true, b: false });
  });

  it('stacks on an owned cell below critical', () => {
    const seeded = seedBoard(createBoard(RECT_2X3), [{ id: cellId(1, 0), count: 1, owner: 'a' }]);
    const result = requireOk(applyMove(seeded, 'a', cellId(1, 0), { a: true, b: false }));
    expect(result.waves).toEqual([]);
    expect(countOf(result.final, 1, 0)).toBe(2);
    expect(getCell(result.final, cellId(1, 0)).neighbors).toHaveLength(3);
  });
});

describe('explosions', () => {
  it('degree-1 cell explodes on the first token and empties', () => {
    const result = requireOk(applyMove(createBoard(LINE2), 'a', cellId(0, 0), NEVER_PLACED));
    expect(result.waves).toHaveLength(2);
    expect(result.waves[0]?.exploded).toEqual([cellId(0, 0)]);
    expect(countOf(result.final, 0, 0)).toBe(1);
    expect(ownerOf(result.final, 0, 0)).toBe('a');
    expect(countOf(result.final, 1, 0)).toBe(0);
    expect(ownerOf(result.final, 1, 0)).toBe(null);
  });

  it('does not award a win on the opening bounce before the opponent has played', () => {
    const result = requireOk(applyMove(createBoard(LINE2), 'a', cellId(0, 0), NEVER_PLACED));
    expect(occupiedCount(result.final, 'b')).toBe(0);
    expect(result.outcome).toEqual({ type: 'ongoing' });
  });

  it('sends one token to each neighbor and keeps leftover after same-wave overshoot', () => {
    let board = createBoard(SQUARE);
    board = seedBoard(board, [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
    ]);

    const result = requireOk(applyMove(board, 'a', cellId(0, 0), NEVER_PLACED));
    const wave2 = result.waves[1];
    if (wave2 === undefined) {
      throw new Error('expected a second wave');
    }
    expect(countOf(wave2.board, 1, 1)).toBe(3);
    expect(ownerOf(wave2.board, 1, 1)).toBe('a');

    const wave3 = result.waves[2];
    if (wave3 === undefined) {
      throw new Error('expected a third wave');
    }
    expect(countOf(wave3.board, 1, 1)).toBe(1);
    expect(ownerOf(wave3.board, 1, 1)).toBe('a');
  });

  it('explodes mutual neighbors in one wave from a snapshot', () => {
    const seeded = seedBoard(createBoard(SQUARE), [
      { id: cellId(0, 0), count: 2, owner: 'a' },
      { id: cellId(1, 0), count: 2, owner: 'a' },
    ]);
    const result = requireOk(applyMove(seeded, 'a', cellId(0, 1), NEVER_PLACED));
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected a wave');
    }
    expect(first.exploded).toEqual([cellId(0, 0), cellId(1, 0)]);
    expect(countOf(first.board, 0, 0)).toBe(1);
    expect(countOf(first.board, 1, 0)).toBe(1);
    expect(countOf(first.board, 0, 1)).toBe(2);
    expect(countOf(first.board, 1, 1)).toBe(1);
    expect(boardCells(first.board).every((cell) => cell.owner === 'a' || cell.count === 0)).toBe(
      true,
    );
  });

  it('converts an opponent neighbor and can wipe after they have played', () => {
    const seeded = seedBoard(createBoard(LINE2), [{ id: cellId(1, 0), count: 1, owner: 'a' }]);
    const result = requireOk(applyMove(seeded, 'b', cellId(0, 0), BOTH_PLACED));
    expect(ownerOf(result.final, 1, 0)).toBe('b');
    expect(occupiedCount(result.final, 'a')).toBe(0);
    expect(result.outcome).toEqual({ type: 'win', player: 'b', cause: 'wipe' });
  });

  it('conserves tokens across a cascade', () => {
    const seeded = seedBoard(createBoard(SQUARE), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
    ]);
    const before = tokenCount(seeded, 'a');
    const result = requireOk(applyMove(seeded, 'a', cellId(0, 0), NEVER_PLACED));
    expect(tokenCount(result.final, 'a') + tokenCount(result.final, 'b')).toBe(before + 1);
  });
});

describe('cycles', () => {
  it('awards the player with more occupied cells when a position repeats', () => {
    const board = seedBoard(createBoard(CYCLE_ARENA), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
      { id: cellId(3, 0), count: 1, owner: 'b' },
    ]);
    const result = requireOk(applyMove(board, 'a', cellId(0, 0), BOTH_PLACED));
    expect(result.outcome).toEqual({ type: 'win', player: 'a', cause: 'cycle' });
    expect(occupiedCount(result.final, 'a')).toBeGreaterThan(occupiedCount(result.final, 'b'));
    expect(occupiedCount(result.final, 'b')).toBe(1);
  });

  it('draws when a repeated position has equal occupied cells', () => {
    const board = seedBoard(createBoard(CYCLE_ARENA), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
      { id: cellId(3, 0), count: 1, owner: 'b' },
      { id: cellId(4, 0), count: 1, owner: 'b' },
      { id: cellId(3, 1), count: 1, owner: 'b' },
    ]);
    const result = requireOk(applyMove(board, 'a', cellId(0, 0), BOTH_PLACED));
    expect(occupiedCount(result.final, 'a')).toBe(occupiedCount(result.final, 'b'));
    expect(result.outcome).toEqual({ type: 'draw' });
  });
});

describe('hotseat applyTurn', () => {
  it('plays a complete two-move wipe on a degree-1 line', () => {
    let game = createGame(LINE2);
    const first = requireOk(applyTurn(game, cellId(0, 0)));
    game = first.game;
    expect(game.currentPlayer).toBe('b');
    expect(game.outcome.type).toBe('ongoing');

    const second = requireOk(applyTurn(game, cellId(1, 0)));
    expect(second.game.outcome).toEqual({ type: 'win', player: 'b', cause: 'wipe' });
    expect(occupiedCount(second.game.board, 'a')).toBe(0);
    expect(second.game.currentPlayer).toBe('b');
  });

  it('rejects moves after the game is over', () => {
    let game = createGame(LINE2);
    game = requireOk(applyTurn(game, cellId(0, 0))).game;
    game = requireOk(applyTurn(game, cellId(1, 0))).game;
    expect(applyTurn(game, cellId(1, 0))).toEqual({ ok: false, reason: 'game-over' });
  });

  it('switches players only while the outcome is ongoing', () => {
    let game = createGame(SQUARE);
    game = requireOk(applyTurn(game, cellId(0, 0))).game;
    expect(game.currentPlayer).toBe('b');
    game = requireOk(applyTurn(game, cellId(1, 0))).game;
    expect(game.currentPlayer).toBe('a');
    expect(ownerOf(game.board, 0, 0)).toBe('a');
    expect(ownerOf(game.board, 1, 0)).toBe('b');
  });
});

describe('collapsible walls', () => {
  const BRIDGE = map('bridge', ['##=##']);

  it('rejects isolated cells that only touch walls, orphan walls, and overlaps', () => {
    expect(() => createBoard(map('touch-only', ['#=#']))).toThrow(/isolated/);
    expect(() => createBoard(map('orphan', ['##.=']))).toThrow(/orphan wall/);
    expect(() =>
      createBoard({
        id: 'overlap',
        name: 'overlap',
        cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        walls: [{ x: 1, y: 0 }],
      }),
    ).toThrow(/overlapping/);
  });

  it('does not collapse on placement, and refuses a place on the plate', () => {
    const board = createBoard(AIRLOCK);
    expect(board.walls).toEqual([cellId(3, 1)]);
    const quiet = requireOk(applyMove(board, 'a', cellId(0, 0), NEVER_PLACED));
    expect(quiet.waves).toEqual([]);
    expect(quiet.afterPlacement.walls).toEqual(board.walls);
    expect(quiet.final.walls).toEqual(board.walls);
    expect(applyMove(board, 'a', cellId(3, 1), NEVER_PLACED)).toEqual({
      ok: false,
      reason: 'unknown-cell',
    });
  });

  it('opens a bridge after the dump, without sending the blast through the plate', () => {
    const seeded = seedBoard(createBoard(BRIDGE), [{ id: cellId(1, 0), count: 1, owner: 'a' }]);
    const before = tokenCount(seeded, 'a') + tokenCount(seeded, 'b');
    const result = requireOk(applyMove(seeded, 'a', cellId(1, 0), NEVER_PLACED));
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected a wave');
    }
    expect(first.exploded).toEqual([cellId(1, 0)]);
    expect(first.transfers.map((transfer) => transfer.to)).toEqual([cellId(0, 0)]);
    expect(first.transfers.some((transfer) => transfer.to === cellId(2, 0))).toBe(false);
    expect(first.collapsed).toEqual([cellId(2, 0)]);
    expect(countOf(first.board, 2, 0)).toBe(0);
    expect(ownerOf(first.board, 2, 0)).toBeNull();
    expect(first.board.walls).toEqual([]);
    expect(getCell(first.board, cellId(1, 0)).neighbors).toEqual([cellId(2, 0), cellId(0, 0)]);
    expect(getCell(first.board, cellId(3, 0)).neighbors).toEqual([cellId(4, 0), cellId(2, 0)]);
    expect(tokenCount(result.final, 'a') + tokenCount(result.final, 'b')).toBe(before + 1);
    expect(hashBoard(createBoard(BRIDGE))).not.toBe(hashBoard(createBoard(map('open', ['#####']))));
  });

  it('does not collapse a diagonally touching wall', () => {
    const board = seedBoard(createBoard(map('diag', ['##.', '=##'])), [
      { id: cellId(1, 0), count: 1, owner: 'a' },
    ]);
    const result = requireOk(applyMove(board, 'a', cellId(1, 0), NEVER_PLACED));
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected a wave');
    }
    expect(first.collapsed).toEqual([]);
    expect(first.board.walls).toEqual([cellId(0, 1)]);
  });

  it('lets a later turn dump through the new plate onto the far island', () => {
    const opened = requireOk(
      applyMove(
        seedBoard(createBoard(BRIDGE), [{ id: cellId(1, 0), count: 1, owner: 'a' }]),
        'a',
        cellId(1, 0),
        NEVER_PLACED,
      ),
    );
    expect(opened.final.walls).toEqual([]);
    const charged = requireOk(applyMove(opened.final, 'a', cellId(2, 0), { a: true, b: false }));
    const cross = requireOk(applyMove(charged.final, 'a', cellId(2, 0), { a: true, b: false }));
    const first = cross.waves[0];
    if (first === undefined) {
      throw new Error('expected the new plate to explode');
    }
    expect(first.exploded).toEqual([cellId(2, 0)]);
    expect(first.transfers.map((transfer) => transfer.to).sort()).toEqual([
      cellId(1, 0),
      cellId(3, 0),
    ]);
  });

  it('still wipes through leftover walls when the opponent is gone', () => {
    const seeded = seedBoard(createBoard(AIRLOCK), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'b' },
    ]);
    const result = requireOk(applyMove(seeded, 'a', cellId(0, 0), BOTH_PLACED));
    expect(occupiedCount(result.final, 'b')).toBe(0);
    expect(result.outcome).toEqual({ type: 'win', player: 'a', cause: 'wipe' });
    expect(result.final.walls).toEqual([cellId(3, 1)]);
  });
});

describe('seedBoard', () => {
  it('throws on duplicate, unknown, or non-positive seeds', () => {
    const board = createBoard(LINE2);
    expect(() =>
      seedBoard(board, [
        { id: cellId(0, 0), count: 1, owner: 'a' },
        { id: cellId(0, 0), count: 1, owner: 'a' },
      ]),
    ).toThrow(/Duplicate/);
    expect(() => seedBoard(board, [{ id: cellId(8, 8), count: 1, owner: 'a' }])).toThrow(
      /Unknown seed/,
    );
    expect(() => seedBoard(board, [{ id: cellId(0, 0), count: 0, owner: 'a' }])).toThrow(
      /integer >= 1/,
    );
  });
});

describe('random legal play terminates each cascade', () => {
  function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  it('never hangs and stays internally consistent on shipped-size graphs', () => {
    const arena = map(
      'random-arena',
      ['#####', '#####', '#####', '#####', '#####'],
    );
    const rng = mulberry32(20260907);

    for (let gameIndex = 0; gameIndex < 40; gameIndex += 1) {
      let game = createGame(arena);
      let moves = 0;
      while (game.outcome.type === 'ongoing' && moves < 200) {
        const options = legalMoves(game.board, game.currentPlayer);
        const pick = options[Math.floor(rng() * options.length)];
        if (pick === undefined) {
          throw new Error('legalMoves returned empty while game is ongoing');
        }
        const tokensBefore = tokenCount(game.board, 'a') + tokenCount(game.board, 'b');
        const result = requireOk(applyTurn(game, pick));
        const tokensAfter =
          tokenCount(result.game.board, 'a') + tokenCount(result.game.board, 'b');
        expect(tokensAfter).toBe(tokensBefore + 1);
        for (const cell of boardCells(result.game.board)) {
          expect(cell.count).toBeGreaterThanOrEqual(0);
          if (cell.count === 0) {
            expect(cell.owner).toBeNull();
          } else {
            expect(cell.owner).not.toBeNull();
          }
        }
        game = result.game;
        moves += 1;
      }
      expect(moves).toBeGreaterThan(0);
    }
  });
});
