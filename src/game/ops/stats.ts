import type { Outcome, TurnSuccess } from '../engine/types';

export type MatchStats = {
  readonly moves: number;
  readonly maxChain: number;
  readonly detonations: number;
};

export function emptyStats(): MatchStats {
  return { moves: 0, maxChain: 0, detonations: 0 };
}

export function addTurn(stats: MatchStats, turn: TurnSuccess): MatchStats {
  const detonations = turn.waves.reduce((sum, wave) => sum + wave.exploded.length, 0);
  return {
    moves: stats.moves + 1,
    maxChain: Math.max(stats.maxChain, turn.waves.length),
    detonations: stats.detonations + detonations,
  };
}

export type StarId = 'hold' | 'swift' | 'cascade';

export type StarAward = {
  readonly earned: readonly StarId[];
};

export function awardStars(
  outcome: Outcome,
  stats: MatchStats,
  thresholds: { readonly swiftMoves: number; readonly cascadeWaves: number },
): StarAward {
  if (outcome.type !== 'win') {
    return { earned: [] };
  }
  const earned: StarId[] = ['hold'];
  if (stats.moves <= thresholds.swiftMoves) {
    earned.push('swift');
  }
  if (stats.maxChain >= thresholds.cascadeWaves) {
    earned.push('cascade');
  }
  return { earned };
}
