import Phaser from 'phaser';
import { applyTurn, createGame } from '../game/engine/game';
import { legalMoves, occupiedCount } from '../game/engine/board';
import type { CellId, Game, Outcome, TurnSuccess, WaveStep } from '../game/engine/types';
import { requireMap, type MapId } from '../game/maps';
import { CANVAS_HEIGHT, CANVAS_WIDTH, playerTheme, theme } from '../game/theme';
import { BoardView } from './play/BoardView';

export type PlaySceneData = {
  readonly mapId: MapId;
};

export class PlayScene extends Phaser.Scene {
  private mapId: MapId = 'rect5';
  private match!: Game;
  private boardView!: BoardView;
  private turnText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private locked = false;

  public constructor() {
    super({ key: 'PlayScene' });
  }

  public init(data: PlaySceneData): void {
    if (data.mapId === undefined) {
      throw new Error('PlayScene requires mapId');
    }
    this.mapId = data.mapId;
  }

  public preload(): void {
    if (!this.textures.exists('bg-play')) {
      this.load.image('bg-play', '/assets/bg-play.png');
    }
  }

  public create(): void {
    const map = requireMap(this.mapId);
    this.match = createGame(map);
    this.locked = false;

    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg-play').setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.28);

    this.add
      .text(64, 36, 'BLASTER MASTER', {
        fontFamily: theme.fonts.display,
        fontSize: '22px',
        color: theme.colors.hudText,
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(64, 64, map.name, {
        fontFamily: theme.fonts.mono,
        fontSize: '16px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0, 0.5);

    this.turnText = this.add
      .text(CANVAS_WIDTH - 64, 36, '', {
        fontFamily: theme.fonts.display,
        fontSize: '22px',
        color: theme.colors.hudText,
        fontStyle: '700',
      })
      .setOrigin(1, 0.5);
    this.scoreText = this.add
      .text(CANVAS_WIDTH - 64, 64, '', {
        fontFamily: theme.fonts.mono,
        fontSize: '16px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(1, 0.5);

    this.add
      .text(64, CANVAS_HEIGHT - 28, 'HOTSEAT  ·  PLACE ON EMPTY OR YOUR CORE', {
        fontFamily: theme.fonts.mono,
        fontSize: '14px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0, 0.5);

    this.boardView = new BoardView(this, this.match.board, {
      x: 140,
      y: 92,
      width: CANVAS_WIDTH - 280,
      height: CANVAS_HEIGHT - 150,
    }, (id) => {
      void this.tryPlace(id);
    });

    this.refreshHud();
    this.boardView.setLegal(this.match.currentPlayer, legalMoves(this.match.board, this.match.currentPlayer));
  }

  private async tryPlace(id: CellId): Promise<void> {
    if (this.locked || this.match.outcome.type !== 'ongoing') {
      return;
    }
    const result = applyTurn(this.match, id);
    if (!result.ok) {
      return;
    }
    this.locked = true;
    this.boardView.setLegal(this.match.currentPlayer, []);
    await this.playTurn(result);
    this.match = result.game;
    this.boardView.setBoard(this.match.board);
    this.refreshHud();
    if (this.match.outcome.type === 'ongoing') {
      this.boardView.setLegal(this.match.currentPlayer, legalMoves(this.match.board, this.match.currentPlayer));
      this.locked = false;
      return;
    }
    this.showOutcome(this.match.outcome);
  }

  private async playTurn(result: TurnSuccess): Promise<void> {
    this.boardView.setBoard(result.afterPlacement);
    await this.wait(70);
    for (const wave of result.waves) {
      await this.playWave(wave);
    }
  }

  private async playWave(wave: WaveStep): Promise<void> {
    this.boardView.flash(wave.exploded);
    this.cameras.main.shake(90, 0.0035);
    const color = playerTheme(this.match.currentPlayer).fill;
    const flights = wave.transfers.map((transfer) => {
      const from = this.boardView.worldCenter(transfer.from);
      const to = this.boardView.worldCenter(transfer.to);
      const orb = this.add.circle(from.x, from.y, 9, color, 1);
      orb.setStrokeStyle(2, playerTheme(this.match.currentPlayer).glow, 0.9);
      orb.setDepth(8);
      return this.tweenTo(orb, to.x, to.y, 230).then(() => {
        orb.destroy();
      });
    });
    await Promise.all(flights);
    this.boardView.setBoard(wave.board);
    await this.wait(50);
  }

  private refreshHud(): void {
    const current = playerTheme(this.match.currentPlayer);
    const a = occupiedCount(this.match.board, 'a');
    const b = occupiedCount(this.match.board, 'b');
    this.turnText.setText(`${current.name} TURN`);
    this.turnText.setColor(current.hex);
    this.scoreText.setText(`AMBER ${a}   CYAN ${b}`);
  }

  private showOutcome(outcome: Outcome): void {
    const veil = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, theme.colors.overlay, 0.72);
    veil.setDepth(20);
    if (outcome.type === 'ongoing') {
      throw new Error('showOutcome called while the match is ongoing');
    }
    const title =
      outcome.type === 'draw' ? 'STALEMATE' : `${playerTheme(outcome.player).name} HOLDS THE CORE`;
    const color = outcome.type === 'draw' ? theme.colors.hudText : playerTheme(outcome.player).hex;
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50, title, {
        fontFamily: theme.fonts.display,
        fontSize: '42px',
        color,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.makeButton(CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT / 2 + 50, 'REMATCH', () => {
      this.scene.restart({ mapId: this.mapId });
    });
    this.makeButton(CANVAS_WIDTH / 2 + 130, CANVAS_HEIGHT / 2 + 50, 'TITLE', () => {
      this.scene.start('TitleScene');
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 48, theme.colors.plateInner, 0.95).setDepth(21);
    bg.setStrokeStyle(2, theme.colors.plateEdge, 1);
    const text = this.add
      .text(x, y, label, {
        fontFamily: theme.fonts.display,
        fontSize: '18px',
        color: theme.colors.hudText,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(22);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, theme.player.a.fill, 1);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, theme.colors.plateEdge, 1);
    });
    bg.on('pointerdown', onClick);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', onClick);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => {
        resolve();
      });
    });
  }

  private tweenTo(target: Phaser.GameObjects.Arc, x: number, y: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        x,
        y,
        duration,
        ease: 'Cubic.Out',
        onComplete: () => {
          resolve();
        },
      });
    });
  }
}
