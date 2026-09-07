import Phaser from 'phaser';
import { boardCells, getCell, mapBounds } from '../../game/engine/board';
import type { Board, CellId, CellState, PlayerId } from '../../game/engine/types';
import { theme } from '../../game/theme';
import { cellCenter, layoutBoard, orbOffsets, type BoardLayout } from '../../game/view/layout';

type CellVisual = {
  readonly id: CellId;
  readonly root: Phaser.GameObjects.Container;
  readonly plate: Phaser.GameObjects.Rectangle;
  readonly rim: Phaser.GameObjects.Rectangle;
  readonly cores: Phaser.GameObjects.Arc[];
  readonly countText: Phaser.GameObjects.Text;
};

export class BoardView {
  public readonly layout: BoardLayout;
  private board: Board;
  private readonly cells = new Map<CellId, CellVisual>();
  private readonly layer: Phaser.GameObjects.Container;
  private legal = new Set<CellId>();
  private currentPlayer: PlayerId = 'a';

  public constructor(
    private readonly scene: Phaser.Scene,
    board: Board,
    area: { x: number; y: number; width: number; height: number },
    private readonly onChoose: (id: CellId) => void,
  ) {
    this.board = board;
    this.layout = layoutBoard(board, area);
    this.layer = scene.add.container(0, 0);
    this.drawShafts(board);
    for (const cell of boardCells(board)) {
      this.cells.set(cell.id, this.createCell(cell));
    }
  }

  public destroy(): void {
    this.layer.destroy(true);
  }

  public setLegal(player: PlayerId, moves: readonly CellId[]): void {
    this.currentPlayer = player;
    this.legal = new Set(moves);
    this.repaintPlates();
  }

  public setBoard(board: Board): void {
    this.board = board;
    for (const cell of boardCells(board)) {
      this.paintCell(this.requireVisual(cell.id), cell);
    }
  }

  public flash(ids: readonly CellId[]): void {
    for (const id of ids) {
      this.requireVisual(id).plate.setFillStyle(theme.colors.warning, 0.95);
    }
  }

  public worldCenter(id: CellId): { x: number; y: number } {
    const visual = this.requireVisual(id);
    return { x: visual.root.x, y: visual.root.y };
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
    const present = new Set(boardCells(board).map((cell) => cell.id));
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

  private createCell(cell: CellState): CellVisual {
    const pos = cellCenter(this.layout, cell.x, cell.y);
    const size = this.layout.cellSize;
    const root = this.scene.add.container(pos.x, pos.y);
    const rim = this.scene.add.rectangle(0, 0, size, size, theme.colors.plateEdge, 1);
    const plate = this.scene.add.rectangle(0, 0, size - 6, size - 6, theme.colors.plateInner, 1);
    plate.setStrokeStyle(2, theme.colors.plate, 1);

    const cores: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 4; i += 1) {
      cores.push(this.scene.add.circle(0, 0, size * 0.1, theme.player.a.fill, 0));
    }
    const countText = this.scene.add
      .text(size * 0.32, -size * 0.32, '', {
        fontFamily: theme.fonts.mono,
        fontSize: `${Math.max(12, Math.floor(size * 0.22))}px`,
        color: theme.colors.hudText,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const visual: CellVisual = { id: cell.id, root, plate, rim, cores, countText };

    plate.setInteractive({ useHandCursor: true });
    plate.on('pointerover', () => {
      this.paintPlate(visual, getCell(this.board, visual.id), true);
    });
    plate.on('pointerout', () => {
      this.paintPlate(visual, getCell(this.board, visual.id), false);
    });
    plate.on('pointerdown', () => {
      this.onChoose(visual.id);
    });

    root.add([rim, plate, ...cores, countText]);
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
    const radius = this.layout.cellSize * 0.16;
    const offsets = orbOffsets(cell.count, radius);
    visual.cores.forEach((orb, index) => {
      const slot = offsets[index];
      if (slot === undefined || cell.owner === null) {
        orb.setAlpha(0);
        return;
      }
      const look = theme.player[cell.owner];
      orb.setPosition(slot.x, slot.y);
      orb.setFillStyle(look.fill, 1);
      orb.setStrokeStyle(2, look.glow, 0.85);
      orb.setAlpha(1);
    });
    if (cell.count > 4) {
      visual.countText.setText(String(cell.count));
      visual.countText.setAlpha(1);
    } else {
      visual.countText.setText('');
      visual.countText.setAlpha(0);
    }
    if (cell.owner !== null && cell.count === cell.neighbors.length - 1) {
      this.scene.tweens.add({
        targets: visual.rim,
        alpha: { from: 1, to: 0.4 },
        duration: 380,
        yoyo: true,
        repeat: 1,
      });
    } else {
      visual.rim.setAlpha(1);
    }
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
