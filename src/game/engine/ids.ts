import type { CellId, PlayerId } from './types';

export function cellId(x: number, y: number): CellId {
  return `${x},${y}`;
}

export function parseCellId(id: CellId): { x: number; y: number } {
  const sep = id.indexOf(',');
  if (sep <= 0 || sep === id.length - 1) {
    throw new Error(`Invalid cell id "${id}"`);
  }
  const x = Number(id.slice(0, sep));
  const y = Number(id.slice(sep + 1));
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`Invalid cell id "${id}"`);
  }
  return { x, y };
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'a' ? 'b' : 'a';
}
