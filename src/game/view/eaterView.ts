import { deepDegree, getCell } from '../engine/board';
import type { Board, CellId, EaterStep, WaveStep } from '../engine/types';

/**
 * The eater's presentation maths — PURE, no Phaser. The engine stays the source of
 * truth: this module only turns its snapshots (`WaveStep`, `EaterStep`, the board)
 * into the state a body is drawn in and the order the cues are played in.
 *
 * WHY IT LIVES HERE. The owner's brief is presentation-only, and there is no
 * browser in this environment: the only part of "does it read as fuller" that can
 * be PROVEN is the maths, so it is a pure function with tests beside it (the
 * `layout.ts` / `reachPips` pattern). `BoardView` calls it and does the drawing.
 */

/**
 * How many spheres the shell can show. A square's `deepDegree` is at most eight
 * (every orthogonal and diagonal neighbour live), and that number IS the eater's
 * own detonation threshold, so eight slots cover every hoard the rule can reach
 * before the body fires.
 */
export const SHELL_SLOTS = 8;

/**
 * What one eater body looks like right now. `heat` is the alert level in [0, 1]
 * and `critical` is "this activation detonates": both come from the hoard and the
 * square's own `deepDegree`, so the same count reads differently on a corner
 * (threshold 3) and in the middle (threshold 8) — the owner's deep-degree rule
 * made visible.
 */
export type EaterShell = {
  readonly hoard: number;
  readonly threshold: number;
  /** Spheres shown inside the body: one per held token, capped at `SHELL_SLOTS`. */
  readonly spheres: number;
  /** Pulses per second. Never falls as the hoard grows. */
  readonly pulseRate: number;
  /** Pulse amplitude as a fraction of the body scale. Never falls either. */
  readonly pulseDepth: number;
  /** 0 calm … 1 about to blow. */
  readonly heat: number;
  /** The hoard has reached the square's deep degree: this body is about to fire. */
  readonly critical: boolean;
};

/**
 * `threshold` is the ENGINE'S `deepDegree` of the square the eater stands on,
 * never a hardcoded 3 or 8. A threshold of 0 (an isolated square, which detonates
 * at once) is folded to "fully charged" rather than dividing by zero.
 */
export function eaterShell(hoard: number, threshold: number): EaterShell {
  const limit = Math.max(0, Math.floor(threshold));
  const held = Math.max(0, Math.floor(hoard));
  const fill = limit <= 0 ? 1 : Math.min(1, held / limit);
  return {
    hoard: held,
    threshold: limit,
    spheres: Math.min(held, SHELL_SLOTS),
    pulseRate: 0.5 + 2.5 * fill,
    pulseDepth: 0.04 + 0.14 * fill,
    heat: fill,
    critical: held >= limit,
  };
}

/**
 * Where the hoard's spheres sit inside the shell, as offsets from its centre.
 * One sphere sits in the middle; two or more spread onto a ring that starts at
 * the top and turns clockwise, so the count is readable at a glance.
 */
export function shellOffsets(count: number, radius: number): readonly { x: number; y: number }[] {
  const shown = Math.max(0, Math.min(Math.floor(count), SHELL_SLOTS));
  if (shown === 0) {
    return [];
  }
  if (shown === 1) {
    return [{ x: 0, y: 0 }];
  }
  const offsets: { x: number; y: number }[] = [];
  for (let index = 0; index < shown; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / shown;
    offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return offsets;
}

/**
 * One step of the presentation. `wave` replays an engine wave; `emerge` raises a
 * newly revealed eater out of the square its plate fell to; `move` glides a body
 * one orthogonal step; `hold` is a step that stayed put; `detonate` consumes the
 * body as its own blast fires.
 */
export type EaterCue =
  | { readonly kind: 'wave'; readonly index: number }
  | { readonly kind: 'emerge'; readonly at: CellId; readonly shell: EaterShell }
  | {
      readonly kind: 'move';
      readonly from: CellId;
      readonly to: CellId;
      readonly shell: EaterShell;
    }
  | { readonly kind: 'hold'; readonly at: CellId; readonly shell: EaterShell }
  | { readonly kind: 'detonate'; readonly at: CellId };

/**
 * The ORDER the turn is shown in. The engine hands back all waves first and all
 * eater steps after, which is not the order the player watches: an eater's glide
 * must come before the blast that consumes it, and a revealed eater must rise out
 * of the broken square BEFORE it moves. This interleaves them from the engine's
 * own data only:
 *
 *   * a wave's `collapsed` list is exactly the squares that reveal an eater
 *     (every fallen plate reveals one), so an `emerge` cue is emitted right after
 *     that wave — never a body that simply appears;
 *   * every `EaterStep` emits a `move` (from ≠ to) or a `hold` (from === to), and
 *     a detonating step emits `detonate` followed by its own wave group;
 *   * wave groups are assigned to detonating steps in order, because only a
 *     detonation produces waves in the eater phase and they are pushed in that
 *     same order.
 *
 * The shells are computed from the engine's `deepDegree` of the square the eater
 * stands on, read from the board at that point in the turn.
 */
export function eaterPlan(
  waves: readonly WaveStep[],
  eaters: readonly EaterStep[],
  board: Board,
): readonly EaterCue[] {
  const cues: EaterCue[] = [];
  const shellOf = (hoard: number, at: CellId, from: Board): EaterShell =>
    eaterShell(hoard, deepDegree(getCell(from, at)));
  const pushWave = (index: number): void => {
    const wave = waves[index];
    if (wave === undefined) {
      return;
    }
    cues.push({ kind: 'wave', index });
    for (const at of wave.collapsed) {
      cues.push({ kind: 'emerge', at, shell: shellOf(0, at, wave.board) });
    }
  };

  // Player-cascade waves run first; the eater phase's waves all sit after the
  // first detonation, because a non-detonating activation emits no wave at all.
  let firstDetonation = waves.length;
  for (const [index, wave] of waves.entries()) {
    if (wave.eaterDetonation && index < firstDetonation) {
      firstDetonation = index;
    }
  }
  for (let index = 0; index < firstDetonation; index += 1) {
    pushWave(index);
  }

  let group = firstDetonation;
  for (const step of eaters) {
    if (step.from === step.to) {
      cues.push({ kind: 'hold', at: step.to, shell: shellOf(step.hoard, step.to, board) });
    } else {
      cues.push({
        kind: 'move',
        from: step.from,
        to: step.to,
        shell: shellOf(step.hoard, step.to, board),
      });
    }
    if (!step.detonated || waves[group] === undefined) {
      continue;
    }
    cues.push({ kind: 'detonate', at: step.to });
    let end = group + 1;
    while (end < waves.length && waves[end]?.eaterDetonation !== true) {
      end += 1;
    }
    for (let index = group; index < end; index += 1) {
      pushWave(index);
    }
    group = end;
  }
  return cues;
}
