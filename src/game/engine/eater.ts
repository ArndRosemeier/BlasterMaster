import {
  collapseWalls,
  deepBlastTargets,
  deepDegree,
  detonate,
  eaterAt,
  getCell,
  hashBoard,
  orthoNeighborIds,
  revealEaters,
} from './board';
import { stepCascade } from './cascade';
import type { Board, CellId, EaterState, EaterStep, PlayerId, WaveStep } from './types';

/**
 * Where the eater eats NEXT: the ortho-adjacent cell with the MOST tokens, scanning
 * CLOCKWISE FROM NORTH with the first square in a tie winning. `orthoNeighborIds`
 * emits N, E, S, W in that order, which is the whole tie-break; a square with no
 * tokens is never a candidate, so a hungry eater with nothing beside it stays put.
 *
 * Another EATER's square is not a meal: the hoard is the eater's body, so it is
 * skipped rather than counted. Two eaters therefore never share a square.
 */
export function nextMeal(board: Board, eater: EaterState): CellId | null {
  const cell = getCell(board, eater.at);
  let best: CellId | null = null;
  let bestCount = 0;
  for (const id of orthoNeighborIds(cell.x, cell.y)) {
    const candidate = board.cells[id];
    if (candidate === undefined || eaterAt(board, id) !== undefined) {
      continue;
    }
    if (candidate.count > bestCount) {
      bestCount = candidate.count;
      best = id;
    }
  }
  return best;
}

/**
 * The eater MOVES: the square it leaves reverts to empty (the hoard travels with
 * it, so nothing is lost) and the square it lands on becomes its own — neutral
 * even with a count, so no player can ever place into it.
 */
function moveEater(board: Board, eater: EaterState, to: CellId): Board {
  const from = getCell(board, eater.at);
  const target = getCell(board, to);
  return {
    ...board,
    cells: {
      ...board.cells,
      [eater.at]: { ...from, count: 0, owner: null },
      [to]: { ...target, count: from.count + target.count, owner: 'neutral' },
    },
    eaters: board.eaters.map((it) => (it.at === eater.at ? { ...it, at: to } : it)),
  };
}

/** The one detonation: it fires as a DEEP cell — deep degree out, deep targets, neutral. */
function detonateEater(
  board: Board,
  eater: EaterState,
  targets: readonly CellId[],
): { readonly board: Board; readonly wave: WaveStep } {
  const withoutEater: Board = {
    ...board,
    eaters: board.eaters.filter((it) => it.at !== eater.at),
  };
  const dump = detonate(withoutEater, eater.master, [{ id: eater.at, targets }]);
  const grown = collapseWalls(dump.board, [eater.at], [eater.at]);
  const next = revealEaters(grown.board, grown.collapsed, eater.master);
  return {
    board: next,
    wave: {
      board: next,
      exploded: [eater.at],
      transfers: dump.transfers,
      collapsed: grown.collapsed,
      cracked: grown.cracked,
      spreader: 'neutral',
      eaterDetonation: true,
    },
  };
}

/** Explode the neutral tokens a detonation left behind until the board is stable. */
function settleNeutral(
  board: Board,
  fallback: PlayerId,
  seen: Set<string>,
): { readonly board: Board; readonly waves: readonly WaveStep[] } {
  const waves: WaveStep[] = [];
  let current = board;
  for (;;) {
    const step = stepCascade(current, fallback, fallback, seen);
    if (step.kind === 'stable') {
      return { board: current, waves };
    }
    waves.push(step.wave);
    current = step.board;
    if (step.repeated) {
      return { board: current, waves };
    }
  }
}

/**
 * ONE eater's activation: move to the biggest ortho pile and absorb it (or stay if
 * there is nothing to eat), then — if the hoard has reached the DEEP degree of the
 * square it now stands on, whatever that square is — detonate ONCE and be gone.
 * Overshoot stays on the square as neutral tokens, so the tokens it ate are all
 * still on the board.
 */
export function activateEater(
  board: Board,
  eater: EaterState,
  seen: Set<string>,
): {
  readonly board: Board;
  readonly waves: readonly WaveStep[];
  readonly step: EaterStep;
  readonly removed: boolean;
} {
  const from = eater.at;
  const meal = nextMeal(board, eater);
  const standing = meal === null ? board : moveEater(board, eater, meal);
  const at = meal === null ? from : meal;
  const cell = getCell(standing, at);
  const hoard = cell.count;
  const ate = meal === null ? 0 : hoard - getCell(board, from).count;

  if (hoard < deepDegree(cell)) {
    return {
      board: standing,
      waves: [],
      step: { from, to: at, ate, hoard, detonated: false },
      removed: false,
    };
  }

  const detonation = detonateEater(standing, { ...eater, at }, deepBlastTargets(cell));
  const settled = settleNeutral(detonation.board, eater.master, seen);
  return {
    board: settled.board,
    waves: [detonation.wave, ...settled.waves],
    step: { from, to: at, ate, hoard, detonated: true },
    removed: true,
  };
}

/**
 * THE EATER PHASE, right after the revealer's turn: every eater whose `master` is
 * the player who just moved activates, in REVEAL ORDER. An eater revealed DURING
 * the phase (its housing fell to a neutral blast) is appended to the list and
 * activates in the same phase, because a reveal is immediate.
 *
 * Termination is structural, not hopeful: each eater is activated at most once per
 * phase, a detonation removes it, and every wave of a neutral settle goes through
 * the same repeat guard as a player's cascade. Nothing here appends state per
 * wave, which is the one way a guard like this can be defeated.
 */
export function runEaterPhase(
  board: Board,
  turnPlayer: PlayerId,
): { readonly board: Board; readonly waves: readonly WaveStep[]; readonly eaters: readonly EaterStep[] } {
  const waves: WaveStep[] = [];
  const eaters: EaterStep[] = [];
  const seen = new Set<string>([hashBoard(board)]);
  let current = board;
  let index = 0;
  while (index < current.eaters.length) {
    const eater = current.eaters[index];
    if (eater === undefined) {
      break;
    }
    if (eater.master !== turnPlayer) {
      index += 1;
      continue;
    }
    const activation = activateEater(current, eater, seen);
    current = activation.board;
    waves.push(...activation.waves);
    eaters.push(activation.step);
    // A detonation removed it, so the NEXT eater has shifted into this index.
    index = activation.removed ? index : index + 1;
  }
  return { board: current, waves, eaters };
}
