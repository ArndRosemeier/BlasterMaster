import { collapseWalls, criticalExplosions, detonate, hashBoard, revealEaters } from './board';
import type { Board, Owner, PlayerId, WaveStep } from './types';

export type CascadeStep =
  | { readonly kind: 'stable' }
  | {
      readonly kind: 'wave';
      readonly board: Board;
      readonly wave: WaveStep;
      /** The wave reproduced a position already in `seen`: stop the cascade here. */
      readonly repeated: boolean;
    };

/**
 * ONE wave of a cascade: snapshot every critical pile, dump them, damage the
 * plates and reveal an eater for every plate that fell (a cracked plate reveals
 * nothing). `seen` is the repeat guard, seeded by the caller with the position the
 * cascade starts from.
 *
 * `fallback` is the colour a NON-neutral pile spreads (the mover's — an opponent's
 * pile that fires on your turn hands you its tokens). `master` is the player whose
 * turn this cascade belongs to, and therefore owns any eater it releases.
 *
 * The wave's colour is `neutral` when ANY pile in it was neutral: a wave carrying
 * a neutral flood is not the mover's own, which is what keeps that flood from
 * awarding a wipe.
 */
export function stepCascade(
  board: Board,
  fallback: PlayerId,
  master: PlayerId,
  seen: Set<string>,
): CascadeStep {
  const explosions = criticalExplosions(board);
  if (explosions.length === 0) {
    return { kind: 'stable' };
  }

  const exploded = explosions.map((explosion) => explosion.id);
  const dump = detonate(board, fallback, explosions);
  const grown = collapseWalls(dump.board, exploded);
  const next = revealEaters(grown.board, grown.collapsed, master);
  const spreader: Owner = dump.transfers.some((transfer) => transfer.owner === 'neutral')
    ? 'neutral'
    : fallback;

  const wave: WaveStep = {
    board: next,
    exploded,
    transfers: dump.transfers,
    collapsed: grown.collapsed,
    cracked: grown.cracked,
    spreader,
    eaterDetonation: false,
  };

  const signature = hashBoard(next);
  const repeated = seen.has(signature);
  if (!repeated) {
    seen.add(signature);
  }
  return { kind: 'wave', board: next, wave, repeated };
}
