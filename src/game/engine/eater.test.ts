import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/rng';
import { NEST, mapFromRows } from '../maps';
import {
  collapseWalls,
  createBoard,
  criticalCells,
  deepDegree,
  getCell,
  hashBoard,
  legalMoves,
  occupiedCount,
  orthoNeighborIds,
  revealEaters,
  seedBoard,
  threshold,
  tokenCount,
} from './board';
import { nextMeal, runEaterPhase } from './eater';
import { applyMove } from './move';
import { cellId, parseCellId } from './ids';
import type { Board, CellId, MapDefinition, MoveResult, MoveSuccess, PlayerId } from './types';

const NEVER_PLACED = { a: false, b: false };
const BOTH_PLACED = { a: true, b: true };

function map(id: string, rows: readonly string[]): MapDefinition {
  return mapFromRows(id, id, rows);
}

/** A plate at a CORNER: once it falls, the eater stands on a 3-edge deep square. */
const CORNER = map('eater-corner', ['+#', '##']);
/** A plate in the middle of a wide room: the eater stands on an 8-edge deep square. */
const VAULT = map('eater-vault', ['#####', '##+##', '#####']);
/** A plate whose square has a ONE-HIT PLATE on its diagonal. */
const DIAG_PLATE = map('eater-diag', ['=.#', '#+#', '#.#']);
/** Two plates whose revealed eaters end up ORTHO-ADJACENT. */
const TWIN = map('eater-twin', ['##', '++', '##']);
/** Two plates whose eaters SHARE their only meal. */
const SHARED = map('eater-shared', ['+#+', '###']);
/** A wide room: a plate in the middle and four squares of slack around it. */
const WIDE = map('eater-wide', ['#####', '#####', '##+##', '#####', '#####']);

function requireOk(result: MoveResult): MoveSuccess {
  if (!result.ok) {
    throw new Error(`Expected ok move, got ${JSON.stringify(result)}`);
  }
  return result;
}

function ownerOf(board: Board, id: CellId): string | null {
  return getCell(board, id).owner;
}

function countOf(board: Board, id: CellId): number {
  return getCell(board, id).count;
}

function totalTokens(board: Board): number {
  return Object.values(board.cells).reduce((sum, cell) => sum + cell.count, 0);
}

/** A live cell ortho-adjacent to `id`: the square a test detonates to drop a plate. */
function opener(board: Board, id: CellId): CellId {
  const pos = parseCellId(id);
  const found = orthoNeighborIds(pos.x, pos.y).find((neighbour) => board.cells[neighbour] !== undefined);
  if (found === undefined) {
    throw new Error(`No ortho neighbour to drop plate ${id}`);
  }
  return found;
}

/**
 * A board with the plates ALREADY down and their eaters revealed in the given
 * order, built from the engine's own collapse + reveal, so no fixture can drift
 * from the rule that releases them.
 */
function openPlates(
  fixture: MapDefinition,
  plates: readonly CellId[],
  master: PlayerId = 'a',
): Board {
  let current = createBoard(fixture);
  for (const plate of plates) {
    const from = opener(current, plate);
    current = collapseWalls(current, [from]).board;
    current = collapseWalls(current, [from]).board;
    current = revealEaters(current, [plate], master);
  }
  return current;
}

function released(fixture: MapDefinition, plate: CellId, master: PlayerId = 'a'): Board {
  return openPlates(fixture, [plate], master);
}

function eaterBoard(fixture: MapDefinition, plate: CellId, hoard: number): Board {
  return seedBoard(released(fixture, plate), [{ id: plate, count: hoard, owner: 'neutral' }]);
}

describe('every fallen plate reveals its eater', () => {
  it('cracks on the first detonation, falls on the second, and reveals on its square', () => {
    const board = seedBoard(createBoard(VAULT), [{ id: cellId(1, 1), count: 5, owner: 'a' }]);
    const result = requireOk(applyMove(board, 'a', cellId(1, 1), NEVER_PLACED));

    expect(result.waves).toHaveLength(2);
    expect(result.waves[0]?.cracked).toEqual([cellId(2, 1)]);
    expect(result.waves[0]?.collapsed).toEqual([]);
    expect(result.waves[0]?.board.eaters).toEqual([]);
    expect(result.waves[1]?.collapsed).toEqual([cellId(2, 1)]);
    expect(result.waves[1]?.cracked).toEqual([]);

    // The eater appears on the fallen square with 0 tokens, and that square is
    // `neutral` even at zero: nobody can place into it.
    const final = result.final;
    expect(final.eaters).toEqual([{ at: cellId(2, 1), master: 'a' }]);
    expect(ownerOf(final, cellId(2, 1))).toBe('neutral');
    expect(countOf(final, cellId(2, 1))).toBe(0);
    expect(legalMoves(final, 'a')).not.toContain(cellId(2, 1));
    expect(legalMoves(final, 'b')).not.toContain(cellId(2, 1));
    expect(applyMove(final, 'a', cellId(2, 1), BOTH_PLACED)).toEqual({
      ok: false,
      reason: 'owned-by-opponent',
    });
    // It activated IMMEDIATELY on reveal: nothing adjacent had tokens, so it stayed.
    expect(result.eaters).toEqual([
      { from: cellId(2, 1), to: cellId(2, 1), ate: 0, hoard: 0, detonated: false },
    ]);
  });

  it('reveals from a mere one-hit `=` plate, because EVERY fallen plate does', () => {
    // The old rule only released from a housing glyph; a plain `=` now releases too.
    const plate = map('plain-plate', ['=#', '##']);
    const fallen = collapseWalls(createBoard(plate), [cellId(1, 0)]);
    expect(fallen.collapsed).toEqual([cellId(0, 0)]);
    const revealed = revealEaters(fallen.board, fallen.collapsed, 'b');
    expect(revealed.eaters).toEqual([{ at: cellId(0, 0), master: 'b' }]);
    expect(getCell(revealed, cellId(0, 0)).owner).toBe('neutral');
  });

  it('drops FIVE plates in one cascade and runs all five eaters in fall order', () => {
    // Five one-hit plates over five separately-seeded critical cells: four fall in
    // the wave it triggers and the fifth in the next, which is the real case
    // BULKHEAD and THE SEAM carry. The phase must run all five, in fall order, and
    // still terminate.
    const five = map('eater-five', ['=====', '######']);
    const board = seedBoard(createBoard(five), [
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 2, owner: 'a' },
      { id: cellId(2, 1), count: 2, owner: 'a' },
      { id: cellId(3, 1), count: 2, owner: 'a' },
      { id: cellId(4, 1), count: 1, owner: 'a' },
    ]);
    const result = requireOk(applyMove(board, 'a', cellId(5, 1), NEVER_PLACED));
    expect(result.waves[0]?.collapsed).toEqual([
      cellId(0, 0),
      cellId(1, 0),
      cellId(2, 0),
      cellId(3, 0),
    ]);
    expect(result.waves[1]?.collapsed).toEqual([cellId(4, 0)]);
    expect(result.final.eaters).toHaveLength(5);
    expect(result.eaters.map((step) => step.from)).toEqual([
      cellId(0, 0),
      cellId(1, 0),
      cellId(2, 0),
      cellId(3, 0),
      cellId(4, 0),
    ]);
  });

  it('NEST yields exactly two eaters, one for each of its two plates', () => {
    const nest = createBoard(NEST);
    expect(nest.walls).toEqual([cellId(3, 0), cellId(3, 4)]);
    expect(nest.armored).toEqual([cellId(3, 0), cellId(3, 4)]);
    const opened = openPlates(NEST, [cellId(3, 0), cellId(3, 4)]);
    expect(opened.eaters).toEqual([
      { at: cellId(3, 0), master: 'a' },
      { at: cellId(3, 4), master: 'a' },
    ]);
  });

  it('still runs the slot when the mover cascade ends on the repeat guard', () => {
    // A repeated position with the opponent never having placed is NOT a finished
    // turn: it returns ongoing, so the eater slot is still owed to the mover.
    const arena = map('eater-cycle', ['##.##', '##.##']);
    const seeded = seedBoard(createBoard(arena), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(0, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'a' },
      { id: cellId(3, 0), count: 1, owner: 'neutral' },
    ]);
    const board: Board = { ...seeded, eaters: [{ at: cellId(3, 0), master: 'a' }] };
    const result = requireOk(applyMove(board, 'a', cellId(0, 0), { a: false, b: false }));
    expect(result.outcome).toEqual({ type: 'ongoing' });
    expect(occupiedCount(result.final, 'b')).toBe(0);
    expect(result.eaters).toEqual([
      { from: cellId(3, 0), to: cellId(3, 0), ate: 0, hoard: 1, detonated: false },
    ]);
  });

  it('activates right after the REVEALER, not on the opponent turn', () => {
    const board = seedBoard(createBoard(VAULT), [{ id: cellId(1, 1), count: 5, owner: 'a' }]);
    const revealed = requireOk(applyMove(board, 'a', cellId(1, 1), NEVER_PLACED));
    expect(revealed.eaters).toHaveLength(1);

    // B's turn cannot move an eater B did not release.
    const bTurn = requireOk(applyMove(revealed.final, 'b', cellId(0, 0), BOTH_PLACED));
    expect(bTurn.eaters).toEqual([]);
    expect(bTurn.final.eaters).toEqual([{ at: cellId(2, 1), master: 'a' }]);

    // A's next turn runs its slot again.
    const aTurn = requireOk(applyMove(bTurn.final, 'a', cellId(4, 2), BOTH_PLACED));
    expect(aTurn.eaters).toHaveLength(1);
    expect(aTurn.eaters[0]?.from).toBe(cellId(2, 1));
  });
});

describe('the eater eats', () => {
  it('moves to the biggest ortho neighbour and absorbs its whole stack', () => {
    const board = seedBoard(released(VAULT, cellId(2, 1)), [
      { id: cellId(2, 0), count: 2, owner: 'a' },
      { id: cellId(3, 1), count: 1, owner: 'a' },
      { id: cellId(1, 1), count: 1, owner: 'b' },
    ]);
    const phase = runEaterPhase(board, 'a');

    expect(phase.eaters).toEqual([
      { from: cellId(2, 1), to: cellId(2, 0), ate: 2, hoard: 2, detonated: false },
    ]);
    // The hoard travels: the square it left reverts, the square it took is its own.
    expect(ownerOf(phase.board, cellId(2, 1))).toBeNull();
    expect(countOf(phase.board, cellId(2, 1))).toBe(0);
    expect(ownerOf(phase.board, cellId(2, 0))).toBe('neutral');
    expect(countOf(phase.board, cellId(2, 0))).toBe(2);
    expect(phase.board.eaters).toEqual([{ at: cellId(2, 0), master: 'a' }]);
    // Nothing is created: the hoard was already on the board.
    expect(totalTokens(phase.board)).toBe(totalTokens(board));
  });

  it('breaks a tie clockwise from north, first scanned wins', () => {
    const north = seedBoard(released(VAULT, cellId(2, 1)), [
      { id: cellId(2, 0), count: 2, owner: 'a' },
      { id: cellId(3, 1), count: 2, owner: 'a' },
    ]);
    expect(nextMeal(north, { at: cellId(2, 1), master: 'a' })).toBe(cellId(2, 0));

    // East and west tied, with nothing to the north: CLOCKWISE takes east first.
    // A row-major or id-ordered scan would take west.
    const eastWest = seedBoard(released(VAULT, cellId(2, 1)), [
      { id: cellId(3, 1), count: 2, owner: 'a' },
      { id: cellId(1, 1), count: 2, owner: 'b' },
    ]);
    expect(nextMeal(eastWest, { at: cellId(2, 1), master: 'a' })).toBe(cellId(3, 1));
    expect(runEaterPhase(eastWest, 'a').eaters[0]?.to).toBe(cellId(3, 1));
  });

  it('stays put when nothing beside it has tokens', () => {
    const board = released(VAULT, cellId(2, 1));
    const phase = runEaterPhase(board, 'a');
    expect(phase.eaters).toEqual([
      { from: cellId(2, 1), to: cellId(2, 1), ate: 0, hoard: 0, detonated: false },
    ]);
    expect(phase.waves).toEqual([]);
    expect(phase.board).toBe(board);
  });

  it('never treats another eater as a meal', () => {
    const two = openPlates(TWIN, [cellId(0, 1), cellId(1, 1)]);
    const fed = seedBoard(two, [{ id: cellId(1, 1), count: 2, owner: 'neutral' }]);
    expect(fed.eaters).toEqual([
      { at: cellId(0, 1), master: 'a' },
      { at: cellId(1, 1), master: 'a' },
    ]);
    // The other eater's hoard is the biggest thing beside it, and it is a BODY.
    expect(nextMeal(fed, { at: cellId(0, 1), master: 'a' })).toBeNull();
    const phase = runEaterPhase(fed, 'a');
    expect(phase.eaters).toEqual([
      { from: cellId(0, 1), to: cellId(0, 1), ate: 0, hoard: 0, detonated: false },
      { from: cellId(1, 1), to: cellId(1, 1), ate: 0, hoard: 2, detonated: false },
    ]);
    expect(countOf(phase.board, cellId(1, 1))).toBe(2);
    expect(phase.board.eaters).toHaveLength(2);
  });

  it('reveals two plates in the order they fall, and activates them in that order', () => {
    // (1,0) touches BOTH plates, so one move cracks them in wave 1 and drops
    // them in wave 2: the reveal order is the fall order, not a test's choice.
    const board = seedBoard(createBoard(SHARED), [{ id: cellId(1, 0), count: 1, owner: 'a' }]);
    const result = requireOk(applyMove(board, 'a', cellId(1, 0), NEVER_PLACED));
    expect(result.waves).toHaveLength(2);
    expect(result.waves[0]?.cracked).toEqual([cellId(0, 0), cellId(2, 0)]);
    expect(result.waves[1]?.collapsed).toEqual([cellId(0, 0), cellId(2, 0)]);
    expect(result.final.eaters).toEqual([
      { at: cellId(0, 0), master: 'a' },
      { at: cellId(2, 0), master: 'a' },
    ]);
    expect(result.eaters.map((step) => step.from)).toEqual([cellId(0, 0), cellId(2, 0)]);
  });

  it('activates in REVEAL ORDER, and the order changes the position', () => {
    const both = seedBoard(openPlates(SHARED, [cellId(0, 0), cellId(2, 0)]), [
      { id: cellId(1, 0), count: 4, owner: 'neutral' },
    ]);
    expect(both.eaters).toEqual([
      { at: cellId(0, 0), master: 'a' },
      { at: cellId(2, 0), master: 'a' },
    ]);
    const forwards = runEaterPhase(both, 'a');
    // The first eater takes the shared pile; the second has nothing left.
    expect(forwards.eaters.map((step) => step.to)).toEqual([cellId(1, 0), cellId(2, 0)]);
    expect(forwards.eaters[0]?.ate).toBe(4);

    const swapped: Board = { ...both, eaters: [both.eaters[1]!, both.eaters[0]!] };
    const backwards = runEaterPhase(swapped, 'a');
    expect(backwards.eaters.map((step) => step.to)).toEqual([cellId(1, 0), cellId(0, 0)]);
    // Reveal order is STATE, so these two outcomes are different positions.
    expect(hashBoard(forwards.board)).not.toBe(hashBoard(backwards.board));
  });
});

describe('the eater detonates', () => {
  it('uses the DEEP degree of its square, whether or not that square is deep', () => {
    // The corner square is a plain cell (natural threshold 2) whose DEEP degree is 3.
    const corner = eaterBoard(CORNER, cellId(0, 0), 2);
    const cell = getCell(corner, cellId(0, 0));
    expect(cell.deep).toBe(false);
    expect(threshold(cell)).toBe(2);
    expect(deepDegree(cell)).toBe(3);
    // 2 is one short of the deep degree: the natural rule would have fired it, and
    // the wave snapshot must not see it at all.
    expect(criticalCells(corner)).not.toContain(cellId(0, 0));
    expect(runEaterPhase(corner, 'a').eaters[0]?.detonated).toBe(false);

    const armed = runEaterPhase(eaterBoard(CORNER, cellId(0, 0), 3), 'a');
    expect(armed.eaters[0]?.detonated).toBe(true);
    expect(armed.waves[0]?.eaterDetonation).toBe(true);
    expect(armed.waves[0]?.spreader).toBe('neutral');

    // The interior square is a plain cell with natural threshold 4 and deep degree 8.
    const heart = eaterBoard(VAULT, cellId(2, 1), 4);
    const heartCell = getCell(heart, cellId(2, 1));
    expect(threshold(heartCell)).toBe(4);
    expect(deepDegree(heartCell)).toBe(8);
    expect(runEaterPhase(heart, 'a').eaters[0]?.detonated).toBe(false);
    const heartArmed = runEaterPhase(eaterBoard(VAULT, cellId(2, 1), 8), 'a');
    expect(heartArmed.eaters[0]?.detonated).toBe(true);
  });

  it('detonates ONCE and is gone, leaving its surplus as neutral tokens', () => {
    const board = eaterBoard(CORNER, cellId(0, 0), 4);
    const phase = runEaterPhase(board, 'a');

    expect(phase.eaters).toEqual([
      { from: cellId(0, 0), to: cellId(0, 0), ate: 0, hoard: 4, detonated: true },
    ]);
    expect(phase.waves).toHaveLength(1);
    expect(phase.waves[0]?.exploded).toEqual([cellId(0, 0)]);
    expect(phase.waves[0]?.transfers.map((transfer) => transfer.owner)).toEqual([
      'neutral',
      'neutral',
      'neutral',
    ]);
    // 4 in, the deep degree 3 paid one token per target, 1 left as the surplus.
    expect(ownerOf(phase.board, cellId(0, 0))).toBe('neutral');
    expect(countOf(phase.board, cellId(0, 0))).toBe(1);
    expect(countOf(phase.board, cellId(1, 0))).toBe(1);
    expect(countOf(phase.board, cellId(0, 1))).toBe(1);
    expect(countOf(phase.board, cellId(1, 1))).toBe(1);
    expect(phase.board.eaters).toEqual([]);
    expect(totalTokens(phase.board)).toBe(4);
    // Gone for good: a second phase has nothing to run.
    const again = runEaterPhase(phase.board, 'a');
    expect(again.eaters).toEqual([]);
    expect(again.board).toBe(phase.board);
  });

  it('spreads over the DEEP targets, neutralising player squares', () => {
    const board = seedBoard(eaterBoard(VAULT, cellId(2, 1), 8), [
      { id: cellId(1, 0), count: 1, owner: 'a' },
      { id: cellId(3, 2), count: 1, owner: 'b' },
    ]);
    const phase = runEaterPhase(board, 'a');
    const first = phase.waves[0];
    if (first === undefined) {
      throw new Error('expected the detonation');
    }
    expect(first.transfers).toHaveLength(8);
    // Both player squares were on the diagonals and are neutral now, +1.
    expect(ownerOf(first.board, cellId(1, 0))).toBe('neutral');
    expect(countOf(first.board, cellId(1, 0))).toBe(2);
    expect(ownerOf(first.board, cellId(3, 2))).toBe('neutral');
    expect(countOf(first.board, cellId(3, 2))).toBe(2);
    expect(ownerOf(first.board, cellId(2, 1))).toBeNull();
    expect(totalTokens(phase.board)).toBe(10);
    expect(occupiedCount(phase.board, 'a')).toBe(0);
    expect(occupiedCount(phase.board, 'b')).toBe(0);
  });

  it('drops a plate on its DIAGONAL, because its blast is a deep one', () => {
    const board = eaterBoard(DIAG_PLATE, cellId(1, 1), 5);
    // The square it stands on is plain: only a DEEP blast reaches the corner plate.
    expect(getCell(board, cellId(1, 1)).deep).toBe(false);
    expect(deepDegree(getCell(board, cellId(1, 1)))).toBe(5);
    const phase = runEaterPhase(board, 'a');
    expect(phase.waves[0]?.collapsed).toEqual([cellId(0, 0)]);
    expect(phase.board.walls).toEqual([]);
    expect(phase.board.cells[cellId(0, 0)]).toBeDefined();
  });

  it('is fed by an owned blast, and an owned blast cannot capture its square', () => {
    const board = seedBoard(released(VAULT, cellId(2, 1)), [
      { id: cellId(2, 0), count: 2, owner: 'a' },
    ]);
    const result = requireOk(applyMove(board, 'a', cellId(2, 0), BOTH_PLACED));
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected the primed square to fire');
    }
    expect(first.transfers.some((transfer) => transfer.to === cellId(2, 1))).toBe(true);
    // The eater's square stays its own; the token lands in its hoard instead.
    expect(ownerOf(first.board, cellId(2, 1))).toBe('neutral');
    expect(countOf(first.board, cellId(2, 1))).toBe(1);
    expect(result.final.eaters).toEqual([{ at: cellId(2, 1), master: 'a' }]);
  });
});

describe('the eater and the outcome', () => {
  it('never hands the mover the wipe its neutral flood performs', () => {
    // The eater stands on the middle of a wide room with b on its diagonal and a
    // placing far away, outside the blast. The detonation neutralises b's last
    // square, and that is denial, not capture: the game goes on.
    const board = seedBoard(eaterBoard(WIDE, cellId(2, 2), 8), [
      { id: cellId(3, 3), count: 1, owner: 'b' },
    ]);
    expect(board.eaters).toEqual([{ at: cellId(2, 2), master: 'a' }]);
    const result = requireOk(applyMove(board, 'a', cellId(4, 4), BOTH_PLACED));

    expect(result.eaters.some((step) => step.detonated)).toBe(true);
    expect(occupiedCount(result.final, 'b')).toBe(0);
    expect(occupiedCount(result.final, 'a')).toBe(1);
    expect(result.outcome).toEqual({ type: 'ongoing' });
  });

  it('draws when the phase leaves no square owned by either player', () => {
    // A quiet turn first: the eater has nothing to eat and stays.
    const quiet = requireOk(
      applyMove(released(VAULT, cellId(2, 1)), 'a', cellId(1, 0), NEVER_PLACED),
    );
    expect(quiet.eaters.some((step) => step.detonated)).toBe(false);
    expect(quiet.outcome).toEqual({ type: 'ongoing' });

    // Armed, every player square is on the eater's diagonal, so its one detonation
    // neutralises the mover as well: nobody owns anything, and the game is a draw.
    const draw = requireOk(
      applyMove(eaterBoard(VAULT, cellId(2, 1), 8), 'a', cellId(1, 0), NEVER_PLACED),
    );
    expect(occupiedCount(draw.final, 'a')).toBe(0);
    expect(occupiedCount(draw.final, 'b')).toBe(0);
    expect(draw.outcome).toEqual({ type: 'draw' });
  });
});

describe('random play on the eater map', () => {
  it('terminates and keeps its invariants while it releases and spends eaters', () => {
    const rng = mulberry32(20260927);
    for (let gameIndex = 0; gameIndex < 6; gameIndex += 1) {
      let board = createBoard(NEST);
      let currentPlayer: PlayerId = 'a';
      let moves = 0;
      let outcome: { type: string } = { type: 'ongoing' };
      while (outcome.type === 'ongoing' && moves < 120) {
        const options = legalMoves(board, currentPlayer);
        if (options.length === 0) {
          throw new Error(`no legal move while ongoing after ${moves} moves`);
        }
        const pick = options[Math.floor(rng() * options.length)];
        if (pick === undefined) {
          throw new Error('legalMoves returned empty while game is ongoing');
        }
        const result = requireOk(applyMove(board, currentPlayer, pick, { a: true, b: true }));
        board = result.final;
        outcome = result.outcome;
        moves += 1;
        // Tokens are conserved: an eater's hoard IS a cell count, so the whole
        // board's total is still exactly one token per placement.
        expect(tokenCount(board, 'a') + tokenCount(board, 'b') + neutralTokens(board)).toBe(moves);
        for (const cell of Object.values(board.cells)) {
          expect(cell.count).toBeGreaterThanOrEqual(0);
          if (cell.count === 0) {
            // Only an eater's own square is `neutral` at zero.
            const held = board.eaters.some((eater) => eater.at === cell.id);
            expect(cell.owner === null || (held && cell.owner === 'neutral')).toBe(true);
          } else {
            expect(cell.owner).not.toBeNull();
          }
        }
        currentPlayer = currentPlayer === 'a' ? 'b' : 'a';
      }
      expect(moves).toBeGreaterThan(0);
    }
  });
});

/** Tokens on squares no player owns: the eater's hoard and its flood. */
function neutralTokens(board: Board): number {
  return Object.values(board.cells)
    .filter((cell) => cell.owner === 'neutral')
    .reduce((sum, cell) => sum + cell.count, 0);
}
