export type PlayerId = 'a' | 'b';

export type CellId = `${number},${number}`;

export type CellState = {
  readonly id: CellId;
  readonly x: number;
  readonly y: number;
  readonly neighbors: readonly CellId[];
  readonly count: number;
  readonly owner: PlayerId | null;
};

export type Board = {
  readonly cells: Readonly<Record<CellId, CellState>>;
  readonly walls: readonly CellId[];
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
