export type PlayerId = 'a' | 'b';

export type CellId = `${number},${number}`;

export type CellState = {
  readonly id: CellId;
  readonly x: number;
  readonly y: number;
  readonly neighbors: readonly CellId[];
  /** Diagonal cells this one fires into. Empty unless `deep`. */
  readonly diagonals: readonly CellId[];
  /** Map-authored deep cell: detonates at ortho + diagonal degree. */
  readonly deep: boolean;
  readonly count: number;
  readonly owner: PlayerId | null;
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
};

export type WaveStep = {
  readonly board: Board;
  readonly exploded: readonly CellId[];
  readonly transfers: readonly TokenTransfer[];
  readonly collapsed: readonly CellId[];
  /** Plates that took their FIRST hit in this wave and are now cracked. */
  readonly cracked: readonly CellId[];
};

export type MoveSuccess = {
  readonly ok: true;
  readonly afterPlacement: Board;
  readonly waves: readonly WaveStep[];
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
  readonly game: Game;
};

export type TurnResult = TurnSuccess | MoveFailure;

export type TokenSeed = {
  readonly id: CellId;
  readonly count: number;
  readonly owner: PlayerId;
};
