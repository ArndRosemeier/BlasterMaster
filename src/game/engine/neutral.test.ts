import { describe, expect, it } from 'vitest';
import {
  blastTargets,
  createBoard,
  deepDegree,
  getCell,
  hashBoard,
  legalMoves,
  occupiedCount,
  seedBoard,
  threshold,
  tokenCount,
} from './board';
import { cellId } from './ids';
import { applyMove } from './move';
import { mapFromRows } from '../maps';
import type { Board, CellId, EaterState, MapDefinition } from './types';

const BOTH_PLACED = { a: true, b: true };

function map(id: string, rows: readonly string[]): MapDefinition {
  return mapFromRows(id, id, rows);
}

function ownerAt(board: Board, id: CellId): string | null {
  return getCell(board, id).owner;
}

function countAt(board: Board, id: CellId): number {
  return getCell(board, id).count;
}

/**
 * THE THIRD OWNERSHIP STATE — the infrastructure the eater needs, pinned before
 * any actor exists. Every case here builds its neutral piles with `seedBoard`,
 * because in this landing nothing in play can create one yet.
 */
describe('neutral ownership', () => {
  it('is not a placement target and never counts as a player', () => {
    const board = seedBoard(createBoard(map('neutral-square', ['##', '##'])), [
      { id: cellId(0, 0), count: 2, owner: 'neutral' },
      { id: cellId(1, 0), count: 1, owner: 'a' },
    ]);

    expect(legalMoves(board, 'a')).toEqual([cellId(1, 0), cellId(0, 1), cellId(1, 1)]);
    expect(applyMove(board, 'a', cellId(0, 0), BOTH_PLACED)).toEqual({
      ok: false,
      reason: 'owned-by-opponent',
    });
    // The neutral pile is nobody's territory and nobody's tokens.
    expect(occupiedCount(board, 'a')).toBe(1);
    expect(occupiedCount(board, 'b')).toBe(0);
    expect(tokenCount(board, 'a')).toBe(1);
    expect(tokenCount(board, 'b')).toBe(0);
    expect(countAt(board, cellId(0, 0))).toBe(2);
  });

  it('detonates by the NORMAL rule at its own ortho degree and spreads neutral', () => {
    // (0,0) has ONE orthogonal edge and one diagonal: threshold 1, deep degree 2.
    const board = seedBoard(createBoard(map('neutral-flood', ['###..', '.#...'])), [
      { id: cellId(0, 0), count: 1, owner: 'neutral' },
    ]);
    const pile = getCell(board, cellId(0, 0));
    expect(pile.deep).toBe(false);
    // A neutral pile is NOT deep: it fires at its natural degree (1 here), not the
    // deep degree (2), and it carries its own colour out of the square.
    expect(threshold(pile)).toBe(1);
    expect(deepDegree(pile)).toBe(2);

    const result = applyMove(board, 'a', cellId(1, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected the neutral pile to fire');
    }
    expect(first.exploded).toEqual([cellId(0, 0)]);
    expect(first.spreader).toBe('neutral');
    expect(first.transfers).toEqual([
      { from: cellId(0, 0), to: cellId(1, 0), owner: 'neutral' },
    ]);
    // The pile empty out and its token neutralised the mover's own square.
    expect(ownerAt(first.board, cellId(0, 0))).toBeNull();
    expect(ownerAt(first.board, cellId(1, 0))).toBe('neutral');
    expect(countAt(first.board, cellId(1, 0))).toBe(2);
  });

  it('is re-coloured to the blaster with +1 when an owned blast reaches it', () => {
    const board = seedBoard(createBoard(map('neutral-capture', ['####'])), [
      { id: cellId(1, 0), count: 1, owner: 'neutral' },
      { id: cellId(2, 0), count: 1, owner: 'a' },
    ]);
    const result = applyMove(board, 'a', cellId(2, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected the primed cell to fire');
    }
    expect(first.transfers.some((t) => t.to === cellId(1, 0))).toBe(true);
    expect(ownerAt(first.board, cellId(1, 0))).toBe('a');
    expect(countAt(first.board, cellId(1, 0))).toBe(2);
  });

  it('takes the square when a neutral and an owned token land on it in one wave', () => {
    const board = seedBoard(createBoard(map('neutral-race', ['###'])), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
      { id: cellId(2, 0), count: 1, owner: 'neutral' },
    ]);
    const result = applyMove(board, 'a', cellId(1, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected both ends to fire');
    }
    // The neutral token lands first and the blaster's second: an owned spell
    // clears a neutral pile, so the blaster owns the square.
    expect(first.transfers.map((t) => t.owner)).toEqual(['a', 'neutral']);
    expect(ownerAt(first.board, cellId(1, 0))).toBe('a');
    expect(countAt(first.board, cellId(1, 0))).toBe(3);
  });

  it('never hands the mover a wipe when it is the flood that empties the opponent', () => {
    // (0,0) is a neutral pile one token from firing at its own degree 1; (1,0) is
    // the opponent's only cell. The mover places at (4,0), so the FIRST wave is
    // opened by the neutral pile and re-colours (1,0) neutral: the opponent owns
    // nothing, but no mover's colour took it. A wipe here would be a free win.
    const board = seedBoard(createBoard(map('neutral-wipe', ['#####'])), [
      { id: cellId(0, 0), count: 1, owner: 'neutral' },
      { id: cellId(1, 0), count: 1, owner: 'b' },
    ]);
    const result = applyMove(board, 'a', cellId(4, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    expect(result.waves[0]?.spreader).toBe('neutral');
    expect(occupiedCount(result.final, 'b')).toBe(0);
    expect(result.outcome).toEqual({ type: 'ongoing' });
  });

  it('still awards a wipe to the mover whose own colour took the last cells', () => {
    const board = seedBoard(createBoard(map('owned-wipe', ['##'])), [
      { id: cellId(1, 0), count: 1, owner: 'a' },
    ]);
    const result = applyMove(board, 'b', cellId(0, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    expect(result.outcome).toEqual({ type: 'win', player: 'b', cause: 'wipe' });
  });
});

describe('every cell carries its diagonals', () => {
  it('keeps them on a plain cell but never fires through them', () => {
    const board = createBoard(map('plain-corner', ['##', '##']));
    const corner = getCell(board, cellId(0, 0));
    expect(corner.deep).toBe(false);
    expect(corner.diagonals).toEqual([cellId(1, 1)]);
    expect(blastTargets(corner)).toEqual([cellId(1, 0), cellId(0, 1)]);
    expect(threshold(corner)).toBe(2);
    expect(deepDegree(corner)).toBe(3);
  });

  it('still rejects a plain cell whose only neighbour is diagonal', () => {
    expect(() => createBoard(map('plain-diag-only', ['#..', '.##']))).toThrow(/isolated/);
    const deep = createBoard(map('deep-diag-only', ['*..', '.##']));
    expect(getCell(deep, cellId(0, 0)).neighbors).toEqual([]);
    expect(getCell(deep, cellId(0, 0)).diagonals).toEqual([cellId(1, 1)]);
    expect(threshold(getCell(deep, cellId(0, 0)))).toBe(1);
  });

  it('wires the diagonals a fallen plate creates, and still does not fire through them', () => {
    // (0,1) starts as a plate, so (1,0) has no diagonal neighbour at all. When the
    // plate falls the graph is rewired around the new cell and (1,0) gains it: the
    // DATA must arrive even though the plain cell's threshold must not move.
    const board = seedBoard(createBoard(map('rewire-diag', ['##', '=#'])), [
      { id: cellId(0, 0), count: 1, owner: 'a' },
    ]);
    expect(getCell(board, cellId(1, 0)).diagonals).toEqual([]);

    const result = applyMove(board, 'a', cellId(0, 0), BOTH_PLACED);
    if (!result.ok) {
      throw new Error('expected a legal move');
    }
    const first = result.waves[0];
    if (first === undefined) {
      throw new Error('expected the one-hit plate to fall');
    }
    expect(first.collapsed).toEqual([cellId(0, 1)]);
    const plain = getCell(first.board, cellId(1, 0));
    expect(plain.diagonals).toEqual([cellId(0, 1)]);
    // Neighbours stay in the engine's clockwise-from-north order (N, E, S, W).
    expect(plain.neighbors).toEqual([cellId(1, 1), cellId(0, 0)]);
    expect(threshold(plain)).toBe(2);
    expect(deepDegree(plain)).toBe(3);
    expect(blastTargets(plain)).not.toContain(cellId(0, 1));
  });
});

/**
 * The hash contract for the state this landing introduced. These Board values are
 * NOT reachable by play yet (nothing seeds an eater) — the pin is that `hashBoard`
 * is a function of them, exactly like the `#x` contract for cracked plates. A term
 * that goes missing here makes the repeat guard blind.
 */
describe('hashBoard carries the new state', () => {
  const base = createBoard(map('hash-base', ['###']));
  const eater: EaterState = { at: cellId(1, 0), master: 'a' };
  const other: EaterState = { at: cellId(0, 0), master: 'a' };

  function withHoard(board: Board, id: CellId, count: number): Board {
    const cell = getCell(board, id);
    return { ...board, cells: { ...board.cells, [id]: { ...cell, count, owner: 'neutral' } } };
  }

  it('distinguishes an eater, its master, its hoard, and reveal order', () => {
    expect(hashBoard({ ...base, eaters: [eater] })).not.toBe(hashBoard(base));
    expect(hashBoard({ ...base, eaters: [{ ...eater, master: 'b' }] })).not.toBe(
      hashBoard({ ...base, eaters: [eater] }),
    );
    expect(hashBoard({ ...base, eaters: [eater, other] })).not.toBe(
      hashBoard({ ...base, eaters: [other, eater] }),
    );
    // The hoard is the eater's cell count, so it enters through the cell term.
    const fed = { ...base, eaters: [eater] };
    expect(hashBoard(withHoard(fed, cellId(1, 0), 4))).not.toBe(
      hashBoard(withHoard(fed, cellId(1, 0), 2)),
    );
  });
});
