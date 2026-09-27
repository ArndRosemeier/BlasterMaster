import Phaser from 'phaser';
import {
  boardCells,
  boardPlates,
  deepDegree,
  getCell,
  isArmoredPlate,
  isCrackedPlate,
  isEaterCell,
  isNearCritical,
  mapBounds,
  threshold,
} from '../../game/engine/board';
import { parseCellId } from '../../game/engine/ids';
import type { Board, CellId, CellState, PlayerId } from '../../game/engine/types';
import { NEUTRAL_LOOK, theme } from '../../game/theme';
import {
  cellCenter,
  layoutBoard,
  ORB_SLOTS,
  orbOffsets,
  reachPips,
  type BoardLayout,
} from '../../game/view/layout';
import {
  eaterShell,
  shellOffsets,
  SHELL_SLOTS,
  type EaterShell,
} from '../../game/view/eaterView';
import type { PlacementPreview } from '../../game/view/preview';
import {
  coreTexture,
  eaterOrbTexture,
  ensureFxTextures,
  glowTexture,
  spawnBlast,
  spawnImpact,
} from './fx';

type CoreVisual = {
  readonly root: Phaser.GameObjects.Container;
  readonly glow: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
};

/** One gauge pip per outgoing edge, parked on the edge it fires through. */
type SocketVisual = {
  readonly arc: Phaser.GameObjects.Arc;
  readonly ox: number;
  readonly oy: number;
};

type CellVisual = {
  readonly id: CellId;
  readonly root: Phaser.GameObjects.Container;
  readonly plate: Phaser.GameObjects.Rectangle;
  readonly rim: Phaser.GameObjects.Rectangle;
  readonly sockets: SocketVisual[];
  readonly cores: CoreVisual[];
  readonly countText: Phaser.GameObjects.Text;
  /** Container index the pips belong at (after rim, plate and the deep cuts). */
  readonly socketIndex: number;
  /** Direction signature of `sockets`, so a fallen plate can add a new pip. */
  socketKey: string;
};

/**
 * A standing plate. `base` carries the plate's state (plain / armored steel /
 * cracked scorch) and `seam` is the fracture line: dim on an intact armored plate
 * as the "two hits" tell, bright once it has actually cracked.
 */
type PlateVisual = {
  readonly root: Phaser.GameObjects.Container;
  readonly base: Phaser.GameObjects.Rectangle;
  readonly seam: Phaser.GameObjects.Graphics;
};

/**
 * The eater itself: a body whose INSIDES show the hoard as spheres. There is no
 * text on it — fullness is sphere count plus a pulse whose rate and amplitude
 * scale with `hoard / deepDegree(square)`, so a body about to fire is unmistakable
 * and a corner (threshold 3) reads fuller than the middle (threshold 8) at the
 * same count.
 */
type EaterVisual = {
  readonly root: Phaser.GameObjects.Container;
  readonly glow: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Arc;
  readonly maw: Phaser.GameObjects.Arc;
  /** A fixed pool of `SHELL_SLOTS` orbs, never re-allocated. */
  readonly spheres: readonly Phaser.GameObjects.Image[];
  shell: EaterShell;
  /** The shared 16ms tick owns the pulse; this is off while a one-shot tween runs. */
  pulsing: boolean;
};

/** Blend two 0xRRGGBB colours. Pure arithmetic, so no Phaser colour object per paint. */
function mixColours(from: number, to: number, ratio: number): number {
  const t = Math.max(0, Math.min(1, ratio));
  const red = Math.round(((from >> 16) & 0xff) * (1 - t) + ((to >> 16) & 0xff) * t);
  const green = Math.round(((from >> 8) & 0xff) * (1 - t) + ((to >> 8) & 0xff) * t);
  const blue = Math.round((from & 0xff) * (1 - t) + (to & 0xff) * t);
  return (red << 16) | (green << 8) | blue;
}

/** How a plate is painted: its fill, stroke and how loudly the seam shows. */
type PlateStyle = {
  readonly fill: number;
  readonly stroke: number;
  readonly width: number;
  readonly seam: number;
};

/** Deep cells keep a tighter core cluster so the corner pips stay readable. */
function coreScale(deep: boolean): { readonly radius: number; readonly size: number } {
  return deep ? { radius: 0.14, size: 0.28 } : { radius: 0.18, size: 0.4 };
}

export class BoardView {
  public readonly layout: BoardLayout;
  private board: Board;
  private readonly cells = new Map<CellId, CellVisual>();
  private readonly plates = new Map<CellId, PlateVisual>();
  private readonly eaters = new Map<CellId, EaterVisual>();
  private readonly layer: Phaser.GameObjects.Container;
  private readonly ghostLayer: Phaser.GameObjects.Container;
  private legal = new Set<CellId>();
  private currentPlayer: PlayerId = 'a';
  private ghosts: Phaser.GameObjects.GameObject[] = [];
  private spin = 0;
  private clock = 0;
  private readonly spinEvent: Phaser.Time.TimerEvent;

  public constructor(
    private readonly scene: Phaser.Scene,
    board: Board,
    area: { x: number; y: number; width: number; height: number },
    private readonly onChoose: (id: CellId) => void,
    private readonly onHover: (id: CellId | null) => void,
  ) {
    ensureFxTextures(scene);
    this.board = board;
    this.layout = layoutBoard(board, area);
    this.layer = scene.add.container(0, 0);
    this.ghostLayer = scene.add.container(0, 0);
    this.ghostLayer.setDepth(6);
    this.drawShafts(board);
    for (const cell of boardCells(board)) {
      this.cells.set(cell.id, this.createCell(cell));
    }
    for (const plateId of boardPlates(board)) {
      this.plates.set(plateId, this.createPlate(plateId));
    }
    this.syncEaters(board);
    this.spinEvent = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        // ONE shared 16ms tick drives every ambient animation. A per-eater timer
        // would be fine, but a per-frame allocation per sphere would not, and a
        // five-plate map can hold five bodies at once.
        this.clock += this.scene.game.loop.delta / 1000;
        this.spinCores();
        this.pulseEaters();
      },
    });
  }

  public destroy(): void {
    this.spinEvent.remove(false);
    this.clearPreview();
    this.layer.destroy(true);
    this.ghostLayer.destroy(true);
  }

  public setLegal(player: PlayerId, moves: readonly CellId[]): void {
    this.currentPlayer = player;
    this.legal = new Set(moves);
    this.repaintPlates();
    if (moves.length === 0) {
      this.clearPreview();
    }
  }

  public setBoard(board: Board): void {
    this.board = board;
    for (const plateId of [...this.plates.keys()]) {
      if (board.cells[plateId] !== undefined) {
        this.plates.get(plateId)?.root.destroy();
        this.plates.delete(plateId);
      }
    }
    for (const plateId of boardPlates(board)) {
      const existing = this.plates.get(plateId);
      if (existing === undefined) {
        this.plates.set(plateId, this.createPlate(plateId));
        continue;
      }
      this.paintWall(plateId, existing);
    }
    for (const cell of boardCells(board)) {
      if (!this.cells.has(cell.id)) {
        this.cells.set(cell.id, this.createCell(cell));
      }
      this.paintCell(this.requireVisual(cell.id), cell);
    }
    this.syncEaters(board);
  }

  public flash(ids: readonly CellId[]): void {
    for (const id of ids) {
      this.requireVisual(id).plate.setFillStyle(theme.colors.warning, 0.95);
    }
  }

  public blast(ids: readonly CellId[], color: number, intensity: number, forceDeep = false): void {
    for (const id of ids) {
      const pos = this.worldCenter(id);
      const deep = forceDeep || this.board.cells[id]?.deep === true;
      spawnBlast(this.scene, pos.x, pos.y, color, intensity, deep);
    }
  }

  /** A plate's LAST hit: it shatters out of the layer and a cell takes its square. */
  public crackWalls(ids: readonly CellId[]): void {
    for (const id of ids) {
      const plate = this.plates.get(id);
      if (plate === undefined) {
        continue;
      }
      this.scene.tweens.killTweensOf(plate.root);
      this.scene.tweens.add({
        targets: plate.root,
        scaleY: 0.15,
        alpha: 0,
        duration: 160,
        ease: 'Cubic.In',
      });
    }
  }

  /**
   * A plate's FIRST hit: it survives, so it flinches instead of shattering and
   * `setBoard` repaints it scorched. This is the visual half of "damage is one per
   * wave" — an armored plate that flinches has consumed the wave's damage.
   */
  public damageWalls(ids: readonly CellId[]): void {
    for (const id of ids) {
      const plate = this.plates.get(id);
      if (plate === undefined) {
        continue;
      }
      this.scene.tweens.killTweensOf(plate.root);
      plate.root.setScale(1);
      this.scene.tweens.add({
        targets: plate.root,
        scaleX: { from: 1.18, to: 1 },
        scaleY: { from: 0.82, to: 1 },
        duration: 220,
        ease: 'Back.Out',
      });
    }
  }

  public pulseCell(id: CellId): void {
    const visual = this.requireVisual(id);
    this.scene.tweens.killTweensOf(visual.plate);
    visual.plate.setScale(1);
    this.scene.tweens.add({
      targets: visual.plate,
      scaleX: { from: 1.1, to: 1 },
      scaleY: { from: 1.1, to: 1 },
      duration: 160,
      ease: 'Back.Out',
    });
  }

  public worldCenter(id: CellId): { x: number; y: number } {
    const visual = this.requireVisual(id);
    return { x: visual.root.x, y: visual.root.y };
  }

  public showPreview(from: CellId, preview: PlacementPreview): void {
    this.clearPreview();
    const origin = this.worldCenter(from);
    const look = theme.player[this.currentPlayer];
    if (!preview.explodes) {
      const hold = this.scene.add.image(origin.x, origin.y, glowTexture(this.currentPlayer));
      hold.setDisplaySize(36, 36);
      hold.setAlpha(0.55);
      hold.setBlendMode(Phaser.BlendModes.ADD);
      this.ghostLayer.add(hold);
      this.ghosts.push(hold);
      return;
    }
    for (const to of preview.dumps) {
      const dest = this.worldCenter(to);
      const stroke = this.scene.add.graphics();
      stroke.lineStyle(4, look.glow, 0.28);
      stroke.lineBetween(origin.x, origin.y, dest.x, dest.y);
      stroke.lineStyle(2, look.fill, 0.7);
      stroke.lineBetween(origin.x, origin.y, dest.x, dest.y);
      const tip = this.scene.add.image(dest.x, dest.y, coreTexture(this.currentPlayer));
      tip.setDisplaySize(16, 16);
      tip.setAlpha(0.7);
      this.ghostLayer.add([stroke, tip]);
      this.ghosts.push(stroke, tip);
    }
    const leftover = this.scene.add
      .text(origin.x, origin.y + this.layout.cellSize * 0.38, `HOLD ${preview.leftover}`, {
        fontFamily: theme.fonts.mono,
        fontSize: '12px',
        color: preview.leftover > 0 ? theme.colors.hudText : theme.colors.hudMuted,
      })
      .setOrigin(0.5);
    this.ghostLayer.add(leftover);
    this.ghosts.push(leftover);
    for (const wallId of preview.collapsed) {
      const pos = this.squareCenter(wallId);
      this.drawPlateGhost(pos.x, pos.y, true);
    }
    for (const wallId of preview.cracked) {
      const pos = this.squareCenter(wallId);
      this.drawPlateGhost(pos.x, pos.y, false);
    }
    for (const move of preview.eaterMoves) {
      this.drawEatGhost(move);
    }
  }

  /**
   * Where an eater will eat NEXT: a neutral line to the square it takes, a ring on
   * that square, and the size of the bite. A ring drawn in the warning hue means
   * the bite is the eater's LAST — it detonates where it lands.
   */
  private drawEatGhost(move: PlacementPreview['eaterMoves'][number]): void {
    const from = this.squareCenter(move.from);
    const to = this.squareCenter(move.to);
    if (move.to !== move.from) {
      const stroke = this.scene.add.graphics();
      stroke.lineStyle(3, NEUTRAL_LOOK.fill, 0.45);
      stroke.lineBetween(from.x, from.y, to.x, to.y);
      this.ghostLayer.add(stroke);
      this.ghosts.push(stroke);
    }
    const ring = this.scene.add.circle(to.x, to.y, this.layout.cellSize * 0.3, 0, 0);
    ring.setStrokeStyle(
      move.detonated ? 4 : 2,
      move.detonated ? theme.colors.warning : NEUTRAL_LOOK.fill,
      0.95,
    );
    const label = this.scene.add
      .text(to.x, to.y + this.layout.cellSize * 0.62, this.eatLabel(move), {
        fontFamily: theme.fonts.mono,
        fontSize: '12px',
        color: move.detonated ? theme.colors.hudText : NEUTRAL_LOOK.hex,
      })
      .setOrigin(0.5);
    this.ghostLayer.add([ring, label]);
    this.ghosts.push(ring, label);
  }

  /** What the eat ghost says: the bite, or that the eater has nothing to eat. */
  private eatLabel(move: PlacementPreview['eaterMoves'][number]): string {
    if (move.ate === 0) {
      return 'EATER HOLDS';
    }
    return move.detonated ? `EATER EATS ${move.ate} · BOOM` : `EATER EATS ${move.ate}`;
  }

  /**
   * The hover ghost for a plate this wave touches: FILLED means the plate falls
   * (its last hit), HOLLOW means it only cracks (an armored plate surviving).
   */
  private drawPlateGhost(x: number, y: number, falls: boolean): void {
    const size = this.layout.cellSize * 0.72;
    const ghost = this.scene.add.rectangle(
      x,
      y,
      size,
      size,
      theme.colors.warning,
      falls ? 0.28 : 0,
    );
    ghost.setStrokeStyle(2, theme.colors.warning, falls ? 0.95 : 0.7);
    this.ghostLayer.add(ghost);
    this.ghosts.push(ghost);
  }

  public clearPreview(): void {
    for (const ghost of this.ghosts) {
      ghost.destroy();
    }
    this.ghosts = [];
  }

  private requireVisual(id: CellId): CellVisual {
    const visual = this.cells.get(id);
    if (visual === undefined) {
      throw new Error(`Unknown visual ${id}`);
    }
    return visual;
  }

  private drawShafts(board: Board): void {
    const bounds = mapBounds(board);
    const present = new Set([...boardCells(board).map((cell) => cell.id), ...boardPlates(board)]);
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const id = `${x},${y}` as CellId;
        if (present.has(id)) {
          continue;
        }
        const pos = cellCenter(this.layout, x, y);
        const well = this.scene.add.rectangle(
          pos.x,
          pos.y,
          this.layout.cellSize * 0.72,
          this.layout.cellSize * 0.72,
          theme.colors.shaft,
          0.92,
        );
        well.setStrokeStyle(2, 0x1b1510, 0.7);
        this.layer.add(well);
      }
    }
  }

  /**
   * A square's screen centre — a plate's, a cell's, or one the cascade has not
   * drawn yet. ONE home, because a plate ghost, an eater and the hover preview all
   * need the same answer for a square that may have no visual of its own.
   */
  private squareCenter(id: CellId): { x: number; y: number } {
    const existing = this.plates.get(id) ?? this.cells.get(id);
    if (existing !== undefined) {
      return { x: existing.root.x, y: existing.root.y };
    }
    const pos = parseCellId(id);
    return cellCenter(this.layout, pos.x, pos.y);
  }

  private createPlate(id: CellId): PlateVisual {
    const pos = this.squareCenter(id);
    const size = this.layout.cellSize * 0.86;
    const base = this.scene.add.rectangle(0, 0, size, size, theme.colors.wall, 1);
    const seam = this.scene.add.graphics();
    seam.lineStyle(3, theme.colors.warning, 1);
    seam.lineBetween(-size * 0.16, size * 0.3, size * 0.24, -size * 0.32);
    const root = this.scene.add.container(pos.x, pos.y, [base, seam]);
    this.layer.add(root);
    const visual: PlateVisual = { root, base, seam };
    this.paintWall(id, visual);
    return visual;
  }

  /**
   * Plate state is read from the board every time, never tracked separately: an
   * intact `=` is plain, an intact `+` is armored steel with a dim seam, and a
   * cracked `+` is scorched with the warning fracture showing.
   */
  private paintWall(id: CellId, visual: PlateVisual): void {
    const armored = isArmoredPlate(this.board, id);
    const style: PlateStyle = isCrackedPlate(this.board, id)
      ? { fill: theme.colors.wallCracked, stroke: theme.colors.warning, width: 3, seam: 1 }
      : armored
        ? { fill: theme.colors.wallArmor, stroke: theme.colors.plateEdge, width: 4, seam: 0.3 }
        : { fill: theme.colors.wall, stroke: theme.colors.wallEdge, width: 3, seam: 0 };
    visual.base.setFillStyle(style.fill, 1);
    visual.base.setStrokeStyle(style.width, style.stroke, 0.95);
    visual.seam.setAlpha(style.seam);
  }

  private createCell(cell: CellState): CellVisual {
    const pos = cellCenter(this.layout, cell.x, cell.y);
    const size = this.layout.cellSize;
    const root = this.scene.add.container(pos.x, pos.y);
    const rim = this.scene.add.rectangle(0, 0, size, size, theme.colors.plateEdge, 1);
    const plate = this.scene.add.rectangle(0, 0, size - 6, size - 6, theme.colors.plateInner, 1);
    plate.setStrokeStyle(2, theme.colors.plate, 1);

    const sockets: SocketVisual[] = [];
    const cores: CoreVisual[] = [];
    for (let i = 0; i < ORB_SLOTS; i += 1) {
      const coreRoot = this.scene.add.container(0, 0);
      const glow = this.scene.add.image(0, 0, glowTexture('a'));
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setAlpha(0);
      const body = this.scene.add.image(0, 0, coreTexture('a'));
      body.setAlpha(0);
      coreRoot.add([glow, body]);
      cores.push({ root: coreRoot, glow, body });
    }
    const countText = this.scene.add
      .text(size * 0.32, -size * 0.32, '', {
        fontFamily: theme.fonts.mono,
        fontSize: `${Math.max(12, Math.floor(size * 0.22))}px`,
        color: theme.colors.hudText,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Rendered between the deep corner cuts and the cores; the cut count decides
    // the index, so the two never drift apart.
    const cuts = cell.deep ? this.createDeepCuts(size) : [];
    const visual: CellVisual = {
      id: cell.id,
      root,
      plate,
      rim,
      sockets,
      cores,
      countText,
      socketIndex: 2 + cuts.length,
      socketKey: '',
    };

    plate.setInteractive({ useHandCursor: true });
    plate.on('pointerover', () => {
      this.paintPlate(visual, getCell(this.board, visual.id), true);
      this.onHover(visual.id);
    });
    plate.on('pointerout', () => {
      this.paintPlate(visual, getCell(this.board, visual.id), false);
      this.onHover(null);
    });
    plate.on('pointerdown', () => {
      this.onChoose(visual.id);
    });

    root.add([rim, plate, ...cuts, ...cores.map((core) => core.root), countText]);
    this.syncSockets(visual, cell);
    this.layer.add(root);
    this.paintCell(visual, cell);
    return visual;
  }

  /**
   * Keeps one gauge pip per outgoing edge. Rebuilt only when the edge set changes,
   * which happens when a plate falls and rewires a neighbouring deep cell.
   */
  private syncSockets(visual: CellVisual, cell: CellState): void {
    const pips = reachPips(cell, this.layout.cellSize);
    const key = pips.map((pip) => pip.id).join('|');
    if (key === visual.socketKey) {
      return;
    }
    for (const socket of visual.sockets) {
      socket.arc.destroy();
    }
    visual.sockets.length = 0;
    const radius = Math.max(3, this.layout.cellSize * 0.045);
    pips.forEach((pip, index) => {
      const arc = this.scene.add.circle(pip.x, pip.y, radius, theme.colors.plateEdge, 1);
      visual.root.addAt(arc, visual.socketIndex + index);
      visual.sockets.push({ arc, ox: pip.x, oy: pip.y });
    });
    visual.socketKey = key;
  }

  /** Octagon corners: the one deep marker that survives every owner/state hue. */
  private createDeepCuts(size: number): Phaser.GameObjects.Triangle[] {
    const half = (size - 6) / 2;
    const cut = size * 0.1;
    const corners: readonly (readonly [number, number, number, number, number, number])[] = [
      [half, -half, half - cut, -half, half, -half + cut],
      [half, half, half - cut, half, half, half - cut],
      [-half, half, -half + cut, half, -half, half - cut],
      [-half, -half, -half + cut, -half, -half, -half + cut],
    ];
    return corners.map((points) =>
      this.scene.add.triangle(0, 0, ...points, theme.colors.deep, 1),
    );
  }

  private repaintPlates(): void {
    for (const visual of this.cells.values()) {
      this.paintPlate(visual, getCell(this.board, visual.id), false);
    }
  }

  private paintCell(visual: CellVisual, cell: CellState): void {
    this.syncSockets(visual, cell);
    this.paintPlate(visual, cell, false);
    this.paintSockets(visual, cell);
    const scale = coreScale(cell.deep);
    const radius = this.layout.cellSize * scale.radius;
    const size = this.layout.cellSize * scale.size;
    const held = isEaterCell(this.board, cell.id);
    const nearCritical = !held && isNearCritical(cell);
    const offsets = orbOffsets(cell.count, radius);
    visual.cores.forEach((core, index) => {
      const slot = offsets[index];
      if (slot === undefined || cell.owner === null) {
        core.body.setAlpha(0);
        core.glow.setAlpha(0);
        return;
      }
      core.root.setPosition(slot.x, slot.y);
      core.body.setTexture(coreTexture(cell.owner));
      core.glow.setTexture(glowTexture(cell.owner));
      core.body.setDisplaySize(size, size);
      core.glow.setDisplaySize(size * 1.9, size * 1.9);
      core.body.setAlpha(1);
      core.glow.setAlpha(nearCritical ? 0.95 : 0.55);
    });
    // The pips carry the count up to the cell's own rule threshold, and the orbs
    // carry it up to ORB_SLOTS; past whichever is larger, the number must be drawn.
    const carried = Math.max(ORB_SLOTS, threshold(cell));
    if (held) {
      // The eater's own body carries the hoard; a second number would be noise.
      visual.countText.setText('');
      visual.countText.setAlpha(0);
    } else if (cell.count > carried) {
      const textAt = this.layout.cellSize * 0.32;
      visual.countText.setText(String(cell.count));
      visual.countText.setPosition(cell.deep ? 0 : textAt, cell.deep ? 0 : -textAt);
      visual.countText.setAlpha(1);
    } else {
      visual.countText.setText('');
      visual.countText.setAlpha(0);
    }
    this.scene.tweens.killTweensOf(visual.rim);
    if (nearCritical) {
      visual.rim.setAlpha(1);
      this.scene.tweens.add({
        targets: visual.rim,
        alpha: { from: 1, to: 0.35 },
        duration: 360,
        yoyo: true,
        repeat: -1,
      });
    } else {
      visual.rim.setAlpha(1);
    }
  }

  private spinCores(): void {
    this.spin += 0.018;
    for (const cell of boardCells(this.board)) {
      if (cell.owner === null || cell.count < 2) {
        continue;
      }
      const visual = this.requireVisual(cell.id);
      const radius = this.layout.cellSize * coreScale(cell.deep).radius;
      const offsets = orbOffsets(cell.count, radius);
      const angle = this.spin;
      visual.cores.forEach((core, index) => {
        const slot = offsets[index];
        if (slot === undefined || core.body.alpha === 0) {
          return;
        }
        core.root.setPosition(
          slot.x * Math.cos(angle) - slot.y * Math.sin(angle),
          slot.x * Math.sin(angle) + slot.y * Math.cos(angle),
        );
      });
    }
  }

  /**
   * Reconciles the eater bodies with the board: a body whose square no longer
   * holds an eater is gone, and a surviving body's shell is refreshed from the
   * square's count and its own `deepDegree`. It deliberately does NOT create a
   * body — a reveal is presented by `emergeEater`, so an eater can never simply
   * appear on the square its plate fell to.
   */
  private syncEaters(board: Board): void {
    const living = new Set(board.eaters.map((eater) => eater.at));
    for (const [id, visual] of [...this.eaters]) {
      if (living.has(id)) {
        continue;
      }
      this.scene.tweens.killTweensOf(visual.root);
      visual.root.destroy(true);
      this.eaters.delete(id);
    }
    for (const eater of board.eaters) {
      const visual = this.eaters.get(eater.at);
      if (visual === undefined) {
        continue;
      }
      const cell = getCell(board, eater.at);
      this.paintEaterShell(visual, eaterShell(cell.count, deepDegree(cell)));
    }
  }

  /**
   * A plate just fell here, so the eater RISES out of the square: it surges up
   * from beneath, scales and fades in, and lands with a ground impact. It runs
   * before the body's first move — `eaterPlan` orders that — and never as an
   * instant appearance.
   */
  public emergeEater(at: CellId, shell: EaterShell): Promise<void> {
    const existing = this.eaters.get(at);
    if (existing !== undefined) {
      this.paintEaterShell(existing, shell);
      return Promise.resolve();
    }
    const visual = this.buildEaterVisual(at);
    this.eaters.set(at, visual);
    this.paintEaterShell(visual, shell);
    const rise = this.layout.cellSize * 0.62;
    visual.root.setAlpha(0);
    visual.root.setScale(0.2);
    visual.root.y += rise;
    visual.pulsing = false;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: visual.root,
        alpha: 1,
        scale: 1,
        y: visual.root.y - rise,
        duration: 340,
        ease: 'Back.Out',
        onComplete: () => {
          visual.pulsing = true;
          spawnImpact(this.scene, visual.root.x, visual.root.y, theme.colors.eater);
          resolve();
        },
      });
    });
  }

  /**
   * One orthogonal step, in a STRAIGHT axis-aligned line: a single tween drives
   * both coordinates, so the motion can never read as the diagonal travel the
   * rule forbids — and a step that did not move (`from === to`) never gets here.
   */
  public glideEater(from: CellId, to: CellId, shell: EaterShell): Promise<void> {
    const visual = this.eaters.get(from);
    if (visual === undefined) {
      return Promise.resolve();
    }
    const dest = this.squareCenter(to);
    this.eaters.delete(from);
    this.eaters.set(to, visual);
    this.paintEaterShell(visual, shell);
    const distance = Phaser.Math.Distance.Between(visual.root.x, visual.root.y, dest.x, dest.y);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: visual.root,
        x: dest.x,
        y: dest.y,
        duration: Math.max(150, Math.round(distance * 1.7)),
        ease: 'Sine.InOut',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /** A step that found nothing beside it to eat: the body stays, its shell changes. */
  public holdEater(at: CellId, shell: EaterShell): void {
    const visual = this.eaters.get(at);
    if (visual !== undefined) {
      this.paintEaterShell(visual, shell);
    }
  }

  /**
   * The eater's own detonation consumes it: the body swells into the blast and
   * fades while its spheres burst outward. It is unregistered at once, so the
   * board sync that follows cannot present the death as a disappearance.
   */
  public consumeEater(at: CellId): void {
    const visual = this.eaters.get(at);
    if (visual === undefined) {
      return;
    }
    this.eaters.delete(at);
    visual.pulsing = false;
    this.scene.tweens.killTweensOf(visual.root);
    spawnImpact(this.scene, visual.root.x, visual.root.y, theme.colors.eater);
    const burst = this.layout.cellSize * 0.66;
    visual.spheres.forEach((orb, index) => {
      if (orb.alpha === 0) {
        return;
      }
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / SHELL_SLOTS;
      this.scene.tweens.add({
        targets: orb,
        x: Math.cos(angle) * burst,
        y: Math.sin(angle) * burst,
        alpha: 0,
        duration: 170,
        ease: 'Cubic.Out',
      });
    });
    this.scene.tweens.add({
      targets: visual.root,
      scale: 1.8,
      alpha: 0,
      duration: 210,
      ease: 'Cubic.In',
      onComplete: () => {
        visual.root.destroy(true);
      },
    });
  }

  private buildEaterVisual(at: CellId): EaterVisual {
    const pos = this.squareCenter(at);
    const size = this.layout.cellSize;
    const glow = this.scene.add.image(0, 0, glowTexture('neutral'));
    glow.setBlendMode(Phaser.BlendModes.ADD);
    const body = this.scene.add.circle(0, 0, size * 0.3, 0x101408, 0.95);
    body.setStrokeStyle(3, theme.colors.eater, 1);
    const spheres: Phaser.GameObjects.Image[] = [];
    for (let index = 0; index < SHELL_SLOTS; index += 1) {
      const orb = this.scene.add.image(0, 0, eaterOrbTexture());
      orb.setAlpha(0);
      spheres.push(orb);
    }
    const maw = this.scene.add.circle(0, 0, size * 0.1, theme.colors.eater, 0.85);
    // The maw sits UNDER the spheres: the hoard is the readable thing on the body.
    const root = this.scene.add.container(pos.x, pos.y, [glow, body, maw, ...spheres]);
    this.layer.add(root);
    return {
      root,
      glow,
      body,
      maw,
      spheres,
      shell: eaterShell(0, 1),
      pulsing: true,
    };
  }

  /**
   * The shell's state, drawn: the fixed sphere pool is resized and repositioned,
   * and the body's hue slides from the eater hue toward the warning hue as the
   * hoard fills, so a full body wears the warning stroke. Nothing here is
   * per-frame allocation.
   */
  private paintEaterShell(visual: EaterVisual, shell: EaterShell): void {
    visual.shell = shell;
    const size = this.layout.cellSize;
    const hot = mixColours(theme.colors.eater, theme.colors.warning, shell.heat);
    const radius = size * (shell.spheres >= 6 ? 0.15 : 0.18);
    const orbSize = size * (shell.spheres >= 6 ? 0.11 : 0.15);
    const offsets = shellOffsets(shell.spheres, radius);
    visual.spheres.forEach((orb, index) => {
      const slot = offsets[index];
      if (slot === undefined) {
        orb.setAlpha(0);
        return;
      }
      orb.setPosition(slot.x, slot.y);
      orb.setDisplaySize(orbSize, orbSize);
      orb.setAlpha(0.55 + 0.45 * shell.heat);
    });
    visual.body.setStrokeStyle(shell.critical ? 5 : 3, hot, 1);
    visual.body.setFillStyle(shell.critical ? 0x2b2410 : 0x101408, 0.95);
    const glowSize = size * (0.75 + 0.5 * shell.heat);
    visual.glow.setDisplaySize(glowSize, glowSize);
    visual.glow.setTint(hot);
    visual.glow.setAlpha(0.3 + 0.45 * shell.heat);
    visual.maw.setFillStyle(hot, 0.85);
  }

  /**
   * The ambient pulse, once per shared tick: each eater advances its own phase at
   * its own `pulseRate`, so a full body throbs fast and deep while an empty one
   * barely breathes. No allocation, no per-eater timer.
   */
  private pulseEaters(): void {
    for (const visual of this.eaters.values()) {
      if (!visual.pulsing) {
        continue;
      }
      const wave = Math.sin(this.clock * visual.shell.pulseRate * Math.PI * 2);
      visual.root.setScale(1 + visual.shell.pulseDepth * wave);
      visual.glow.setAlpha(0.3 + 0.45 * visual.shell.heat + 0.15 * wave);
    }
  }

  private paintSockets(visual: CellVisual, cell: CellState): void {
    visual.sockets.forEach((socket, index) => {
      socket.arc.setPosition(socket.ox, socket.oy);
      const filled = index < cell.count;
      socket.arc.setFillStyle(filled ? theme.colors.warning : theme.colors.plate, filled ? 1 : 0.55);
    });
  }

  private paintPlate(visual: CellVisual, cell: CellState, hovering: boolean): void {
    const legal = this.legal.has(visual.id);
    const accent = theme.player[this.currentPlayer];
    visual.rim.setFillStyle(legal ? accent.fill : theme.colors.plateEdge, legal ? 0.55 : 1);
    if (hovering && legal) {
      visual.plate.setFillStyle(theme.colors.plateHot, 1);
      return;
    }
    if (isEaterCell(this.board, cell.id)) {
      // The eater's square is its own colour, so the board reads where it stands.
      visual.plate.setFillStyle(0x1b2416, 1);
      visual.plate.setStrokeStyle(3, theme.colors.eater, 0.9);
      return;
    }
    if (isNearCritical(cell)) {
      visual.plate.setFillStyle(0x2a2214, 1);
      visual.plate.setStrokeStyle(2, theme.colors.warning, 0.85);
      return;
    }
    visual.plate.setFillStyle(theme.colors.plateInner, 1);
    visual.plate.setStrokeStyle(2, theme.colors.plate, 1);
  }
}
