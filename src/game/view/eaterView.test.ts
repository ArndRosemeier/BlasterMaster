import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBoard, deepDegree, getCell } from '../engine/board';
import { cellId } from '../engine/ids';
import type { Board, CellId, EaterStep, WaveStep } from '../engine/types';
import { mapFromRows } from '../maps';
import { SHELL_SLOTS, eaterPlan, eaterShell, shellOffsets } from './eaterView';

const ARENA = createBoard(mapFromRows('shell-arena', 'shell-arena', ['###', '#*#', '###']));
const CORNER = cellId(0, 0);
const HEART = cellId(1, 1);

/** The smallest WaveStep that carries what the plan reads: its board and its falls. */
function wave(board: Board, collapsed: readonly CellId[], eaterDetonation = false): WaveStep {
  return {
    board,
    exploded: [],
    transfers: [],
    collapsed,
    cracked: [],
    spreader: 'a',
    eaterDetonation,
  };
}

function step(from: CellId, to: CellId, hoard: number, detonated = false): EaterStep {
  return { from, to, ate: hoard, hoard, detonated };
}

describe('eaterShell', () => {
  it('makes the boundary hoards read differently, and a full corner unmistakable', () => {
    // 1 of 3: a light shell. 3 of 3: full and about to fire.
    expect(eaterShell(1, 3)).toMatchObject({ spheres: 1, critical: false, heat: 1 / 3 });
    expect(eaterShell(3, 3)).toMatchObject({ spheres: 3, critical: true, heat: 1 });
    // 7 of 8 and 8 of 8: seven spheres versus eight, and only the last is critical.
    expect(eaterShell(7, 8)).toMatchObject({ spheres: 7, critical: false });
    expect(eaterShell(8, 8)).toMatchObject({ spheres: 8, critical: true });
    expect(eaterShell(8, 8).pulseRate).toBeGreaterThan(eaterShell(7, 8).pulseRate);
    expect(eaterShell(7, 8).pulseRate).toBeGreaterThan(eaterShell(1, 3).pulseRate);
    expect(eaterShell(7, 8).heat).toBeGreaterThan(eaterShell(1, 3).heat);
  });

  it('never gets calmer as the hoard grows', () => {
    for (const threshold of [3, 8]) {
      let previous = eaterShell(0, threshold);
      for (let hoard = 1; hoard <= 12; hoard += 1) {
        const next = eaterShell(hoard, threshold);
        expect(next.spheres).toBeGreaterThanOrEqual(previous.spheres);
        expect(next.pulseRate).toBeGreaterThanOrEqual(previous.pulseRate);
        expect(next.pulseDepth).toBeGreaterThanOrEqual(previous.pulseDepth);
        expect(next.heat).toBeGreaterThanOrEqual(previous.heat);
        previous = next;
      }
    }
  });

  it('reads the threshold the engine gives the square, not a fixed degree', () => {
    // The pin for the owner's deep-degree rule: the SAME count of 3 is critical on
    // a corner (deepDegree 3) and calm in the middle (deepDegree 8).
    expect(deepDegree(getCell(ARENA, CORNER))).toBe(3);
    expect(deepDegree(getCell(ARENA, HEART))).toBe(8);
    expect(eaterShell(3, deepDegree(getCell(ARENA, CORNER))).critical).toBe(true);
    expect(eaterShell(3, deepDegree(getCell(ARENA, HEART))).critical).toBe(false);
  });
});

describe('shellOffsets', () => {
  it('puts one sphere in the centre and the rest on a ring', () => {
    expect(shellOffsets(0, 10)).toEqual([]);
    expect(shellOffsets(1, 10)).toEqual([{ x: 0, y: 0 }]);
    expect(shellOffsets(2, 10)).toHaveLength(2);
    expect(shellOffsets(SHELL_SLOTS, 10)).toHaveLength(SHELL_SLOTS);
    expect(shellOffsets(99, 10)).toHaveLength(SHELL_SLOTS);
    const top = shellOffsets(4, 10)[0];
    expect(top?.x).toBeCloseTo(0, 6);
    expect(top?.y).toBeCloseTo(-10, 6);
  });
});

describe('eaterPlan', () => {
  it('glides a moving step and holds a staying one', () => {
    const moving = eaterPlan([], [step(CORNER, cellId(1, 0), 1)], ARENA);
    expect(moving).toEqual([
      {
        kind: 'move',
        from: CORNER,
        to: cellId(1, 0),
        shell: eaterShell(1, deepDegree(getCell(ARENA, cellId(1, 0)))),
      },
    ]);
    const staying = eaterPlan([], [step(CORNER, CORNER, 0)], ARENA);
    expect(staying).toEqual([
      { kind: 'hold', at: CORNER, shell: eaterShell(0, deepDegree(getCell(ARENA, CORNER))) },
    ]);
    expect(staying.some((cue) => cue.kind === 'move')).toBe(false);
  });

  it('emerges a revealed eater out of the fallen square before its first move', () => {
    const plan = eaterPlan([wave(ARENA, [CORNER])], [step(CORNER, cellId(1, 0), 2)], ARENA);
    const emerge = plan.findIndex((cue) => cue.kind === 'emerge');
    const move = plan.findIndex((cue) => cue.kind === 'move');
    expect(plan[emerge]).toEqual({
      kind: 'emerge',
      at: CORNER,
      shell: eaterShell(0, deepDegree(getCell(ARENA, CORNER))),
    });
    expect(emerge).toBeGreaterThanOrEqual(0);
    expect(move).toBeGreaterThan(emerge);
  });

  it('plays the detonation wave only after the body has glided onto the square', () => {
    const plan = eaterPlan(
      [wave(ARENA, []), wave(ARENA, [], true), wave(ARENA, [])],
      [step(CORNER, cellId(1, 0), 3, true)],
      ARENA,
    );
    expect(plan.map((cue) => cue.kind)).toEqual(['wave', 'move', 'detonate', 'wave', 'wave']);
    expect(plan[1]).toMatchObject({ kind: 'move', from: CORNER, to: cellId(1, 0) });
    expect(plan[2]).toEqual({ kind: 'detonate', at: cellId(1, 0) });
  });
});

describe('the eater body carries no text', () => {
  const source = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../scenes/play/BoardView.ts'),
    'utf8',
  );

  it('declares an eater visual of spheres, never a Text', () => {
    const start = source.indexOf('type EaterVisual');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = source.slice(start, source.indexOf('};', start));
    expect(block).toContain('spheres');
    expect(block).not.toContain('Text');
    // The old board-sync line that wrote the hoard as a string is gone for good.
    expect(source).not.toContain('setText(String(getCell(board, eater.at).count))');
  });
});
