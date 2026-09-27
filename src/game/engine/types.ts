export type PlayerId = 'a' | 'b';

/**
 * Who owns a pile. `neutral` is a THIRD state, not a missing player: a pile with
 * no player behind it (an eater's flood). `count > 0` still implies a non-null
 * owner — `neutral` is what a token that belongs to nobody carries.
 */
export type Owner = PlayerId | 'neutral';

export type CellId = `${number},${number}`;

export type CellState = {
  readonly id: CellId;
  readonly x: number;
  readonly y: number;
  readonly neighbors: readonly CellId[];
  /**
   * The live diagonal neighbours. EVERY cell carries them; only a `deep` cell
   * counts and fires into them (`threshold`/`blastTargets` gate on `deep`), so a
   * plain cell HAS diagonal neighbours, it just does not use them.
   */
  readonly diagonals: readonly CellId[];
  /** Map-authored deep cell: detonates at ortho + diagonal degree. */
  readonly deep: boolean;
  readonly count: number;
  readonly owner: Owner | null;
};

/**
 * A living eater. It stands ON a cell (its own square, `owner: 'neutral'` even at
 * 0 tokens, so no player can place into it) and its HOARD is that cell's `count` —
 * one home for the tokens, so moving it is a conserved transfer and its death
 * leaves the surplus in place. It activates right after `master`'s turn: `master`
 * is the player whose turn revealed it, and the array order is REVEAL ORDER.
 */
export type EaterState = {
  readonly at: CellId;
  readonly master: PlayerId;
};

/** What one eater activation did, in order, for the view and the pins. */
export type EaterStep = {
  /** The square it stood on when the activation began. */
  readonly from: CellId;
  /** Where it ended up (`from` when it stayed put). */
  readonly to: CellId;
  /** Tokens absorbed from the cell it ate. */
  readonly ate: number;
  /** Its hoard after eating, before any detonation. */
  readonly hoard: number;
  /** True when this activation ended in its one and only detonation. */
  readonly detonated: boolean;
};

export type Board = {
  readonly cells: Readonly<Record<CellId, CellState>>;
  /** INTACT plates: 1-hit (`=`) and undamaged 2-hit (`+`) alike. */
  readonly walls: readonly CellId[];
  /**
   * Damaged 2-hit plates. DISJOINT from `walls`, and still a plate: it blocks,
   * bounds the map and renders exactly like one until its next hit drops it.
   */
  readonly cracked: readonly CellId[];
  /**
   * Map-authored durability, immutable for the life of the board: a `+` plate
   * takes two hits. "Is this plate armored?" is a MAP fact, never a mutation, so
   * `cracked` is always a subset of `armored`.
   */
  readonly armored: readonly CellId[];
  /** Living eaters, in REVEAL ORDER: the order their activations run in. */
  readonly eaters: readonly EaterState[];
};

export type MapCell = {
  readonly x: number;
  readonly y: number;
};

export type MapDefinition = {
  readonly id: string;
  readonly name: string;
  readonly cells: readonly MapCell[];
  readonly walls: readonly MapCell[];
  /** Subset of `walls` that takes two detonations: the `+` glyph. */
  readonly armored: readonly MapCell[];
  /** Subset of `cells` that detonates on the diagonals too. */
  readonly deep: readonly MapCell[];
};

export type HasPlaced = {
  readonly a: boolean;
  readonly b: boolean;
};

export type WinCause = 'wipe' | 'cycle';

export type Outcome =
  | { readonly type: 'ongoing' }
  | { readonly type: 'win'; readonly player: PlayerId; readonly cause: WinCause }
  | { readonly type: 'draw' };

export type IllegalMoveReason = 'unknown-cell' | 'owned-by-opponent' | 'game-over';

export type TokenTransfer = {
  readonly from: CellId;
  readonly to: CellId;
  /**
   * The colour this token carries. Every token of one pile shares it: a NEUTRAL
   * pile keeps neutral, every other pile spreads the mover's colour.
   */
  readonly owner: Owner;
};

export type WaveStep = {
  readonly board: Board;
  readonly exploded: readonly CellId[];
  readonly transfers: readonly TokenTransfer[];
  readonly collapsed: readonly CellId[];
  /** Plates that took their FIRST hit in this wave and are now cracked. */
  readonly cracked: readonly CellId[];
  /**
   * The wave's colour: `neutral` when ANY pile in it was neutral (a neutral
   * flood), otherwise the mover's. A mixed snapshot resolves to neutral, which is
   * the fail-safe side for the wipe rule. The per-token truth is on `transfers`.
   */
  readonly spreader: Owner;
  /** True for an eater's own one-shot detonation, which needs its own FX. */
  readonly eaterDetonation: boolean;
};

export type MoveSuccess = {
  readonly ok: true;
  readonly afterPlacement: Board;
  readonly waves: readonly WaveStep[];
  /** Every eater activation this turn, in order, including reveals. */
  readonly eaters: readonly EaterStep[];
  readonly final: Board;
  readonly hasPlaced: HasPlaced;
  readonly outcome: Outcome;
};

export type MoveFailure = {
  readonly ok: false;
  readonly reason: IllegalMoveReason;
};

export type MoveResult = MoveSuccess | MoveFailure;

export type Game = {
  readonly mapId: string;
  readonly board: Board;
  readonly currentPlayer: PlayerId;
  readonly hasPlaced: HasPlaced;
  readonly outcome: Outcome;
};

export type TurnSuccess = {
  readonly ok: true;
  readonly afterPlacement: Board;
  readonly waves: readonly WaveStep[];
  readonly eaters: readonly EaterStep[];
  readonly game: Game;
};

export type TurnResult = TurnSuccess | MoveFailure;

export type TokenSeed = {
  readonly id: CellId;
  readonly count: number;
  readonly owner: Owner;
};
