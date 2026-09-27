import { describe, expect, it } from 'vitest';
import { seedBoard } from '../engine/board';
import { applyTurn, createGame } from '../engine/game';
import { cellId } from '../engine/ids';
import { AIRLOCK, mapFromRows } from '../maps';
import { previewPlacement } from './preview';
import type { MapDefinition } from '../engine/types';

const SQUARE: MapDefinition = mapFromRows('sq', 'sq', ['##', '##']);

describe('previewPlacement', () => {
  it('shows no dump until a corner reaches two, then leftover stays empty', () => {
    const game = createGame(SQUARE);
    const quiet = previewPlacement(game, cellId(0, 0));
    if (quiet === null) {
      throw new Error('legal preview failed');
    }
    expect(quiet.explodes).toBe(false);
    expect(quiet.dumps).toEqual([]);
    expect(quiet.leftover).toBe(1);
    expect(quiet.collapsed).toEqual([]);

    const placed = applyTurn(game, cellId(0, 0));
    if (!placed.ok) {
      throw new Error('setup failed');
    }
    const primed = applyTurn(placed.game, cellId(1, 1));
    if (!primed.ok) {
      throw new Error('setup failed');
    }
    const boom = previewPlacement(primed.game, cellId(0, 0));
    if (boom === null) {
      throw new Error('legal preview failed');
    }
    expect(boom.explodes).toBe(true);
    expect(boom.dumps).toEqual([cellId(1, 0), cellId(0, 1)]);
    expect(boom.leftover).toBe(0);
    expect(boom.collapsed).toEqual([]);
  });

  it('shows a first-wave wall fall without dumping through the plate', () => {
    const game = createGame(AIRLOCK);
    const primed = {
      ...game,
      board: seedBoard(game.board, [{ id: cellId(2, 1), count: 2, owner: 'a' }]),
    };
    const preview = previewPlacement(primed, cellId(2, 1));
    if (preview === null) {
      throw new Error('legal preview failed');
    }
    expect(preview.explodes).toBe(true);
    expect(preview.dumps).toEqual([cellId(2, 0), cellId(2, 2), cellId(1, 1)]);
    expect(preview.dumps).not.toContain(cellId(3, 1));
    expect(preview.collapsed).toEqual([cellId(3, 1)]);
  });
});
