import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/rng';
import { legalMoves } from '../engine/board';
import { applyTurn, createGame } from '../engine/game';
import type { CellId, MapDefinition, TurnSuccess } from '../engine/types';
import { AIRLOCK, BOLTS, BULKHEAD, NEST, SEAM } from '../maps';
import { eaterPlan } from './eaterView';

function playOut(fixture: MapDefinition, seed: number, cap: number): readonly TurnSuccess[] {
  const random = mulberry32(seed);
  let game = createGame(fixture);
  const turns: TurnSuccess[] = [];
  for (let index = 0; index < cap; index += 1) {
    const moves = legalMoves(game.board, game.currentPlayer);
    if (moves.length === 0 || game.outcome.type !== 'ongoing') {
      break;
    }
    const pick = moves[Math.floor(random() * moves.length)];
    if (pick === undefined) {
      break;
    }
    const result = applyTurn(game, pick);
    if (!result.ok) {
      break;
    }
    turns.push(result);
    game = result.game;
  }
  return turns;
}

const WALL_MAPS: readonly MapDefinition[] = [AIRLOCK, BOLTS, BULKHEAD, NEST, SEAM];

describe('eaterPlan against real engine output', () => {
  it('orders every cue the engine actually produces, on the shipped wall maps', () => {
    let turns = 0;
    let reveals = 0;
    let detonations = 0;
    let moves = 0;
    for (const fixture of WALL_MAPS) {
      for (let seed = 1; seed <= 8; seed += 1) {
        for (const result of playOut(fixture, seed, 120)) {
          turns += 1;
          const collapsed = new Set<CellId>();
          for (const wave of result.waves) {
            for (const at of wave.collapsed) {
              collapsed.add(at);
            }
          }
          const plan = eaterPlan(result.waves, result.eaters, result.game.board);
          expect(plan.filter((cue) => cue.kind === 'wave')).toHaveLength(result.waves.length);
          expect(plan.filter((cue) => cue.kind === 'emerge')).toHaveLength(collapsed.size);
          expect(plan.filter((cue) => cue.kind === 'move' || cue.kind === 'hold')).toHaveLength(
            result.eaters.length,
          );
          expect(plan.filter((cue) => cue.kind === 'detonate')).toHaveLength(
            result.eaters.filter((step) => step.detonated).length,
          );
          const emerged = new Set<CellId>();
          const moved = new Map<CellId, number>();
          plan.forEach((cue, index) => {
            if (cue.kind === 'emerge') {
              emerged.add(cue.at);
              reveals += 1;
            }
            if (cue.kind === 'move') {
              expect(emerged.has(cue.from) || !collapsed.has(cue.from)).toBe(true);
              moved.set(cue.to, index);
              moves += 1;
            }
            if (cue.kind === 'hold') {
              moved.set(cue.at, index);
            }
            if (cue.kind === 'detonate') {
              const at = moved.get(cue.at);
              expect(at).toBeDefined();
              expect(at ?? Number.MAX_SAFE_INTEGER).toBeLessThan(index);
              detonations += 1;
            }
          });
        }
      }
    }
    // A loud, measured line so the coverage cannot silently be zero.
    console.log(
      `[eater-plan] turns=${turns} reveals=${reveals} moves=${moves} detonations=${detonations}`,
    );
    expect(turns).toBeGreaterThan(100);
    expect(reveals).toBeGreaterThan(0);
    expect(moves).toBeGreaterThan(0);
    expect(detonations).toBeGreaterThan(0);
  });
});
