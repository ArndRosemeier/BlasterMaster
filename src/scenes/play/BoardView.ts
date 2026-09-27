import Phaser from 'phaser';
import { boardCells, getCell, mapBounds } from '../../game/engine/board';
import { parseCellId } from '../../game/engine/ids';
import type { Board, CellId, CellState, PlayerId } from '../../game/engine/types';
import { theme } from '../../game/theme';
import { cellCenter, layoutBoard, orbOffsets, type BoardLayout } from '../../game/view/layout';
import type { PlacementPreview } from '../../game/view/preview';
import { coreTexture, ensureFxTextures, glowTexture, spawnBlast } from './fx';

type CoreVisual = {
  readonly root: Phaser.GameObjects.Container;
  readonly glow: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
};

type CellVisual = {
  readonly id: CellId;
  readonly root: Phaser.GameObjects.Container;
  readonly plate: Phaser.GameObjects.Rectangle;
  readonly rim: Phaser.GameObjects.Rectangle;
  readonly sockets: Phaser.GameObjects.Arc[];
  readonly cores: CoreVisual[];
  readonly countText: Phaser.GameObjects.Text;
};

export class BoardView {
  public readonly layout: BoardLayout;
  private board: Board;
  private readonly cells = new Map<CellId, CellVisual>();
  private readonly walls = new Map<CellId, Phaser.GameObjects.Rectangle>();
  private readonly layer: Phaser.GameObjects.Container;
  private readonly ghostLayer: Phaser.GameObjects.Container;
  private legal = new Set<CellId>();
  private currentPlayer: PlayerId = 'a';
  private ghosts: Phaser.GameObjects.GameObject[] = [];
  private spin = 0;
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
    for (const wallId of board.walls) {
      this.walls.set(wallId, this.createWall(wallId));
    }
    this.spinEvent = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.spinCores();
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
    for (const wallId of [...this.walls.keys()]) {
      if (board.cells[wallId] !== undefined) {
        const plate = this.walls.get(wallId);
        plate?.destroy();
        this.walls.delete(wallId);
      }
    }
    for (const wallId of board.walls) {
      if (!this.walls.has(wallId)) {
        this.walls.set(wallId, this.createWall(wallId));
      }
    }
    for (const cell of boardCells(board)) {
      if (!this.cells.has(cell.id)) {
        this.cells.set(cell.id, this.createCell(cell));
      }
      this.paintCell(this.requireVisual(cell.id), cell);
    }
  }

  public flash(ids: readonly CellId[]): void {
    for (const id of ids) {
      this.requireVisual(id).plate.setFillStyle(theme.colors.warning, 0.95);
    }
  }

  public blast(ids: readonly CellId[], color: number, intensity: number): void {
    for (const id of ids) {
      const pos = this.worldCenter(id);
      spawnBlast(this.scene, pos.x, pos.y, color, intensity);
    }
  }

  public crackWalls(ids: readonly CellId[]): void {
    for (const id of ids) {
      const plate = this.walls.get(id);
      if (plate === undefined) {
        continue;
      }
      this.scene.tweens.killTweensOf(plate);
      this.scene.tweens.add({
        targets: plate,
        scaleY: 0.15,
        alpha: 0,
        duration: 160,
        ease: 'Cubic.In',
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
      const pos = this.wallCenter(wallId);
      const crack = this.scene.add.rectangle(
        pos.x,
        pos.y,
        this.layout.cellSize * 0.72,
        this.layout.cellSize * 0.72,
        theme.colors.warning,
        0.28,
      );
      crack.setStrokeStyle(2, theme.colors.warning, 0.95);
      this.ghostLayer.add(crack);
      this.ghosts.push(crack);
    }
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
    const present = new Set([
      ...boardCells(board).map((cell) => cell.id),
      ...board.walls,
    ]);
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

  private wallCenter(id: CellId): { x: number; y: number } {
    const existing = this.walls.get(id);
    if (existing !== undefined) {
      return { x: existing.x, y: existing.y };
    }
    const pos = parseCellId(id);
    return cellCenter(this.layout, pos.x, pos.y);
  }

  private createWall(id: CellId): Phaser.GameObjects.Rectangle {
    const pos = this.wallCenter(id);
    const size = this.layout.cellSize * 0.86;
    const plate = this.scene.add.rectangle(pos.x, pos.y, size, size, theme.colors.wall, 1);
    plate.setStrokeStyle(3, theme.colors.wallEdge, 0.95);
    this.layer.add(plate);
    return plate;
  }

  private createCell(cell: CellState): CellVisual {
    const pos = cellCenter(this.layout, cell.x, cell.y);
    const size = this.layout.cellSize;
    const root = this.scene.add.container(pos.x, pos.y);
    const rim = this.scene.add.rectangle(0, 0, size, size, theme.colors.plateEdge, 1);
    const plate = this.scene.add.rectangle(0, 0, size - 6, size - 6, theme.colors.plateInner, 1);
    plate.setStrokeStyle(2, theme.colors.plate, 1);

    const sockets: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < cell.neighbors.length; i += 1) {
      sockets.push(this.scene.add.circle(0, 0, Math.max(3, size * 0.045), theme.colors.plateEdge, 1));
    }
    const cores: CoreVisual[] = [];
    for (let i = 0; i < 4; i += 1) {
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

    const visual: CellVisual = { id: cell.id, root, plate, rim, sockets, cores, countText };

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

    root.add([rim, plate, ...sockets, ...cores.map((core) => core.root), countText]);
    this.layer.add(root);
    this.paintCell(visual, cell);
    return visual;
  }

  private repaintPlates(): void {
    for (const visual of this.cells.values()) {
      this.paintPlate(visual, getCell(this.board, visual.id), false);
    }
  }

  private paintCell(visual: CellVisual, cell: CellState): void {
    this.paintPlate(visual, cell, false);
    this.paintSockets(visual, cell);
    const radius = this.layout.cellSize * 0.18;
    const size = this.layout.cellSize * 0.4;
    const offsets = orbOffsets(cell.count, radius);
    visual.cores.forEach((core, index) => {
      const slot = offsets[index];
      if (slot === undefined || cell.owner === null) {
        core.body.setAlpha(0);
        core.glow.setAlpha(0);
        return;
      }
      const nearCritical = cell.count === cell.neighbors.length - 1;
      core.root.setPosition(slot.x, slot.y);
      core.body.setTexture(coreTexture(cell.owner));
      core.glow.setTexture(glowTexture(cell.owner));
      core.body.setDisplaySize(size, size);
      core.glow.setDisplaySize(size * 1.9, size * 1.9);
      core.body.setAlpha(1);
      core.glow.setAlpha(nearCritical ? 0.95 : 0.55);
    });
    if (cell.count > 4) {
      visual.countText.setText(String(cell.count));
      visual.countText.setAlpha(1);
    } else {
      visual.countText.setText('');
      visual.countText.setAlpha(0);
    }
    this.scene.tweens.killTweensOf(visual.rim);
    if (cell.owner !== null && cell.count === cell.neighbors.length - 1) {
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
      const radius = this.layout.cellSize * 0.18;
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

  private paintSockets(visual: CellVisual, cell: CellState): void {
    const degree = cell.neighbors.length;
    const span = this.layout.cellSize * 0.28;
    visual.sockets.forEach((pip, index) => {
      const x = degree === 1 ? 0 : -span + (span * 2 * index) / (degree - 1);
      pip.setPosition(x, -this.layout.cellSize * 0.36);
      const filled = index < cell.count;
      pip.setFillStyle(filled ? theme.colors.warning : theme.colors.plate, filled ? 1 : 0.55);
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
    if (cell.owner !== null && cell.count === cell.neighbors.length - 1) {
      visual.plate.setFillStyle(0x2a2214, 1);
      visual.plate.setStrokeStyle(2, theme.colors.warning, 0.85);
      return;
    }
    visual.plate.setFillStyle(theme.colors.plateInner, 1);
    visual.plate.setStrokeStyle(2, theme.colors.plate, 1);
  }
}
