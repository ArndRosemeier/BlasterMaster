import type { Owner, PlayerId } from './engine/types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/** What a pile's owner looks like. Players tint the two seat colours; neutral is its own. */
export type OwnerLook = {
  readonly fill: number;
  readonly glow: number;
  readonly hex: string;
  readonly name: string;
};

/** Neutrals, and an eater's own square: cold slate, deliberately nobody's colour. */
export const NEUTRAL_LOOK: OwnerLook = {
  fill: 0x8c98a4,
  glow: 0xd6e2ea,
  hex: '#8c98a4',
  name: 'NEUTRAL',
};

export const theme = {
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  fonts: {
    display: 'Orbitron, Segoe UI, sans-serif',
    mono: 'Share Tech Mono, Consolas, monospace',
  },
  colors: {
    amber: 0xf0a030,
    cyan: 0x30d0e0,
    warning: 0xf0d020,
    plate: 0x2c3136,
    plateEdge: 0x6a727a,
    plateInner: 0x14181c,
    plateHot: 0x3a2a18,
    wall: 0x2a241c,
    wallEdge: 0xb8924a,
    /** Intact armored plate (`+`): steel, so two hits are readable before the first. */
    wallArmor: 0x3b4a5c,
    /** Cracked armored plate: scorched, wearing the warning fracture. */
    wallCracked: 0x4a3a14,
    /** Deep cells: cut corners, diagonal reach pips, and the menu schematic. */
    deep: 0x9a6ad6,
    /** The eater itself: nothing on the board shares this hue. */
    eater: 0xbfd36a,
    shaft: 0x070809,
    hudText: '#f3ead8',
    hudMuted: '#9a8f7c',
    overlay: 0x050608,
  },
  player: {
    a: {
      fill: 0xf0a030,
      glow: 0xffc56a,
      hex: '#f0a030',
      name: 'AMBER',
    },
    b: {
      fill: 0x30d0e0,
      glow: 0x7af0ff,
      hex: '#30d0e0',
      name: 'CYAN',
    },
  },
} as const;

export function playerTheme(player: PlayerId): (typeof theme.player)[PlayerId] {
  return theme.player[player];
}

/**
 * The ONE place a pile's owner becomes a colour. `theme.player` stays keyed by
 * `PlayerId` — a neutral pile has no seat — so every view that paints by owner
 * comes through here instead of indexing the player table with a widened type.
 */
export function ownerLook(owner: Owner): OwnerLook {
  return owner === 'neutral' ? NEUTRAL_LOOK : playerTheme(owner);
}
