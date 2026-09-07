import Phaser from 'phaser';
import { createBoard } from '../game/engine/board';
import { MAPS, isMapId, type MapId } from '../game/maps';
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from '../game/theme';
import { cellCenter, layoutBoard } from '../game/view/layout';

export class TitleScene extends Phaser.Scene {
  public constructor() {
    super({ key: 'TitleScene' });
  }

  public preload(): void {
    this.load.image('bg-title', '/assets/bg-title.png');
    this.load.image('bg-play', '/assets/bg-play.png');
  }

  public create(): void {
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg-title').setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.34);

    this.add
      .text(CANVAS_WIDTH / 2, 168, 'BLASTER MASTER', {
        fontFamily: theme.fonts.display,
        fontSize: '64px',
        color: theme.colors.hudText,
        fontStyle: '800',
      })
      .setOrigin(0.5);
    this.add
      .text(CANVAS_WIDTH / 2, 232, 'CRITICAL MASS  ·  TWO PILOTS  ·  ONE CORE', {
        fontFamily: theme.fonts.mono,
        fontSize: '18px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0.5);

    this.spawnEmbers();

    const mapIds = (Object.keys(MAPS) as MapId[]).filter((id) => isMapId(id));
    mapIds.forEach((mapId, index) => {
      const map = MAPS[mapId];
      this.drawMapCard(mapId, map.name, map.cells.length, 340 + index * 320, 430);
    });
  }

  private spawnEmbers(): void {
    const tints = [theme.player.a.fill, theme.player.b.fill, 0xd8c8a8];
    for (let i = 0; i < 20; i += 1) {
      const tint = tints[i % tints.length];
      if (tint === undefined) {
        throw new Error('ember tint missing');
      }
      const ember = this.add.circle(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 2, tint, 0.2);
      this.tweens.add({
        targets: ember,
        y: ember.y - 90,
        alpha: 0,
        duration: 3600 + Math.random() * 1800,
        repeat: -1,
        onRepeat: () => {
          ember.setPosition(Math.random() * CANVAS_WIDTH, CANVAS_HEIGHT - 40);
          ember.setAlpha(0.22);
        },
      });
    }
  }

  private drawMapCard(mapId: MapId, name: string, cellCount: number, x: number, y: number): void {
    const card = this.add.rectangle(x, y, 280, 220, theme.colors.plateInner, 0.88);
    card.setStrokeStyle(2, theme.colors.plateEdge, 1);
    this.add
      .text(x, y + 78, name, {
        fontFamily: theme.fonts.display,
        fontSize: '18px',
        color: theme.colors.hudText,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 102, `${cellCount} CELLS`, {
        fontFamily: theme.fonts.mono,
        fontSize: '14px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0.5);

    this.drawSchematic(mapId, x, y - 28);

    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => {
      card.setStrokeStyle(2, theme.player.a.fill, 1);
      card.setScale(1.03);
    });
    card.on('pointerout', () => {
      card.setStrokeStyle(2, theme.colors.plateEdge, 1);
      card.setScale(1);
    });
    card.on('pointerdown', () => {
      this.scene.start('PlayScene', { mapId });
    });
  }

  private drawSchematic(mapId: MapId, x: number, y: number): void {
    const board = createBoard(MAPS[mapId]);
    const layout = layoutBoard(board, { x: x - 90, y: y - 56, width: 180, height: 112 });
    for (const cell of Object.values(board.cells)) {
      const pos = cellCenter(layout, cell.x, cell.y);
      this.add.rectangle(pos.x, pos.y, layout.cellSize - 2, layout.cellSize - 2, theme.colors.plateEdge, 0.95);
    }
  }
}
