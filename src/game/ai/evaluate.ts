import { blastTargets, boardCells, isNearCritical, threshold } from '../engine/board';
import { opponentOf } from '../engine/ids';
import type { Board, Outcome, PlayerId } from '../engine/types';

const WIN = 100_000;
const DRAW = 0;

/**
 * Per-player judgement, derived entirely from the engine's rule primitives.
 *
 * `pressure` is `count / threshold(cell)` summed over owned cells: how close a
 * cell is to detonating, so the same token count on a deep cell is *further*
 * from firing than on a plain one. `reach` is `blastTargets(cell).length`
 * summed over owned cells: how many cells a detonation dumps into.
 *
 * Nothing here reads `neighbors`, `diagonals` or `deep`, and nothing here
 * divides by a degree constant: a deep heart and a plain centre of equal count
 * score differently PURELY because the rule says their thresholds differ.
 * `eslint.config.js` forbids those member reads under `src/game/ai/**`.
 */
type RuleFeatures = {
  readonly territory: number;
  readonly tokens: number;
  readonly pressure: number;
  readonly reach: number;
  readonly nearCritical: number;
};

function ruleFeatures(board: Board, player: PlayerId): RuleFeatures {
  let territory = 0;
  let tokens = 0;
  let pressure = 0;
  let reach = 0;
  let nearCritical = 0;
  for (const cell of boardCells(board)) {
    if (cell.owner !== player) continue;
    territory += 1;
    tokens += cell.count;
    pressure += cell.count / threshold(cell);
    reach += blastTargets(cell).length;
    if (isNearCritical(cell)) {
      nearCritical += 1;
    }
  }
  return { territory, tokens, pressure, reach, nearCritical };
}

type Weights = {
  readonly territory: number;
  readonly tokens: number;
  readonly pressure: number;
  readonly reach: number;
  readonly nearCritical: number;
};

/**
 * Asymmetric on purpose: the foe's territory and reach count for more than the
 * same quantity owned, so the heuristic defends rather than races.
 *
 * `pressure` outscores `reach` by design (40 vs 1 per edge): the reach of a
 * deep cell is real, but a deep cell of the same count is further from
 * detonating, and that imminence is what the rule makes scarce.
 */
const MINE: Weights = { territory: 14, tokens: 4, pressure: 40, reach: 1, nearCritical: 3 };
const FOE: Weights = { territory: 16, tokens: 3, pressure: 48, reach: 2, nearCritical: 6 };

function weighted(features: RuleFeatures, weights: Weights): number {
  return (
    features.territory * weights.territory +
    features.tokens * weights.tokens +
    features.pressure * weights.pressure +
    features.reach * weights.reach +
    features.nearCritical * weights.nearCritical
  );
}

export function evaluatePosition(board: Board, player: PlayerId, outcome: Outcome): number {
  if (outcome.type === 'win') {
    return outcome.player === player ? WIN : -WIN;
  }
  if (outcome.type === 'draw') {
    return DRAW;
  }

  const foe = opponentOf(player);
  return weighted(ruleFeatures(board, player), MINE) - weighted(ruleFeatures(board, foe), FOE);
}
