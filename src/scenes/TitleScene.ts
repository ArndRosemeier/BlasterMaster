import Phaser from 'phaser';
import { armAudio, loadSoundBank, playSound, playTitleTheme } from '../game/audio/bus';
import { boardPlates, createBoard, isArmoredPlate } from '../game/engine/board';
import { parseCellId } from '../game/engine/ids';
import type { MapDefinition } from '../game/engine/types';
import { AI_DIFFICULTIES, type AiDifficulty } from '../game/ai/choose';
import { CAMPAIGN, type Mission } from '../game/ops/campaign';
import { browserStore, isMissionUnlocked, loadProgressOrReset, starsFor } from '../game/ops/progress';
import { MAPS, MAP_LIST, isMapId, type MapId } from '../game/maps';
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from '../game/theme';
import { cardGrid, cellCenter, layoutBoard, mapCardText } from '../game/view/layout';
import { publicAsset } from '../lib/publicAsset';
import { addWordmark, makePanelButton } from './ui/chrome';

type MenuView = 'root' | 'ops' | 'skirmish';

export class TitleScene extends Phaser.Scene {
  private view: MenuView = 'root';
  private panel?: Phaser.GameObjects.Container;
  private skirmishDifficulty: AiDifficulty | 'hotseat' = 'operator';

  public constructor() {
    super({ key: 'TitleScene' });
  }

  public preload(): void {
    this.load.image('bg-title', publicAsset('assets/bg-title.png'));
    this.load.image('bg-play', publicAsset('assets/bg-play.png'));
  }

  public create(): void {
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg-title').setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.38);
    this.drawTitleHalo();
    const wordmark = addWordmark(this, CANVAS_WIDTH / 2, 92, '52px');
    this.tweens.add({
      targets: wordmark,
      scale: { from: 1, to: 1.035 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.add
      .text(CANVAS_WIDTH / 2, 142, 'A REACTOR YOU PLAY WITH YOUR HANDS', {
        fontFamily: theme.fonts.mono,
        fontSize: '16px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0.5);
    this.spawnEmbers();
    this.view = 'root';
    this.renderPanel();
    void loadSoundBank().then(() => {
      playTitleTheme();
    });
    this.input.on('pointerdown', () => {
      armAudio();
      playTitleTheme();
    });
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    if (this.panel === undefined) {
      throw new Error('Title panel missing');
    }
    this.panel.add(object);
    return object;
  }

  private renderPanel(): void {
    this.panel?.destroy(true);
    this.panel = this.add.container(0, 0);
    if (this.view === 'root') {
      this.drawRoot();
      return;
    }
    if (this.view === 'ops') {
      this.drawOps();
      return;
    }
    this.drawSkirmish();
  }

  private drawRoot(): void {
    if (this.panel === undefined) {
      throw new Error('Title panel missing');
    }
    makePanelButton(this, CANVAS_WIDTH / 2 - 190, 400, 320, 88, 'OPERATIONS', () => {
      armAudio();
      playSound('ui');
      this.view = 'ops';
      this.renderPanel();
    }, 10, this.panel);
    makePanelButton(this, CANVAS_WIDTH / 2 + 190, 400, 320, 88, 'SKIRMISH', () => {
      armAudio();
      playSound('ui');
      this.view = 'skirmish';
      this.renderPanel();
    }, 10, this.panel);
    this.panel.add(
      this.add
        .text(CANVAS_WIDTH / 2, 520, 'OPERATIONS IS THE GAME.  SKIRMISH IS THE SANDBOX.', {
          fontFamily: theme.fonts.mono,
          fontSize: '14px',
          color: theme.colors.hudMuted,
        })
        .setOrigin(0.5),
    );
  }

  private drawOps(): void {
    const progress = loadProgressOrReset(browserStore());
    CAMPAIGN.forEach((mission, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      this.drawMissionCard(
        mission,
        isMissionUnlocked(progress, mission.id),
        starsFor(progress, mission.id),
        230 + col * 310,
        238 + row * 142,
      );
    });
    makePanelButton(this, 120, CANVAS_HEIGHT - 48, 160, 44, 'BACK', () => {
      playSound('ui');
      this.view = 'root';
      this.renderPanel();
    }, 10, this.panel);
  }

  private drawSkirmish(): void {
    const labels: readonly (AiDifficulty | 'hotseat')[] = [...AI_DIFFICULTIES, 'hotseat'];
    labels.forEach((id, index) => {
      const x = 260 + index * 200;
      const selected = this.skirmishDifficulty === id;
      const label = id === 'hotseat' ? 'HOTSEAT' : id.toUpperCase();
      const pill = this.keep(this.add.rectangle(x, 198, 180, 36, theme.colors.plateInner, selected ? 0.98 : 0.7));
      pill.setStrokeStyle(2, selected ? theme.player.a.fill : theme.colors.plateEdge, 1);
      this.keep(
        this.add
          .text(x, 198, label, {
            fontFamily: theme.fonts.display,
            fontSize: '14px',
            color: theme.colors.hudText,
            fontStyle: '700',
          })
          .setOrigin(0.5),
      );
      pill.setInteractive({ useHandCursor: true });
      pill.on('pointerdown', () => {
        playSound('ui');
        this.skirmishDifficulty = id;
        this.renderPanel();
      });
    });

    // Nine maps fill a 3x3; the deep-field tenth needs a fourth column to stay on screen.
    const cols = MAP_LIST.length > 9 ? 4 : 3;
    const placements = cardGrid(MAP_LIST.length, cols, {
      firstX: cols === 4 ? 175 : 230,
      topY: 258,
      pitchX: 310,
      pitchY: 142,
      centerX: CANVAS_WIDTH / 2,
    });
    MAP_LIST.forEach((map, index) => {
      const place = placements[index];
      if (place === undefined) {
        throw new Error(`MAP_LIST placement missing for index ${index}`);
      }
      this.drawMapCard(map, place.x, place.y);
    });

    makePanelButton(this, 120, CANVAS_HEIGHT - 48, 160, 44, 'BACK', () => {
      playSound('ui');
      this.view = 'root';
      this.renderPanel();
    }, 10, this.panel);
  }

  private drawMissionCard(mission: Mission, unlocked: boolean, stars: number, x: number, y: number): void {
    const card = this.keep(this.add.rectangle(x, y, 296, 128, theme.colors.plateInner, unlocked ? 0.9 : 0.45));
    card.setStrokeStyle(2, unlocked ? theme.colors.plateEdge : 0x2a2a2a, 1);
    this.keep(
      this.add
        .text(x, y - 44, mission.title, {
          fontFamily: theme.fonts.display,
          fontSize: '15px',
          color: unlocked ? theme.colors.hudText : theme.colors.hudMuted,
          fontStyle: '700',
        })
        .setOrigin(0.5),
    );
    this.keep(
      this.add
        .text(x, y - 14, unlocked ? mission.dossier : 'LOCKED  ·  HOLD THE PREVIOUS CORE', {
          fontFamily: theme.fonts.mono,
          fontSize: '12px',
          color: theme.colors.hudMuted,
          wordWrap: { width: 276 },
          align: 'center',
        })
        .setOrigin(0.5),
    );
    this.keep(
      this.add
        .text(x, y + 24, unlocked ? starLine(stars) : '★ ☆ ☆', {
          fontFamily: theme.fonts.display,
          fontSize: '18px',
          color: unlocked ? theme.player.a.hex : theme.colors.hudMuted,
        })
        .setOrigin(0.5),
    );
    this.keep(
      this.add
        .text(x, y + 48, mission.difficulty.toUpperCase(), {
          fontFamily: theme.fonts.mono,
          fontSize: '12px',
          color: theme.colors.hudMuted,
        })
        .setOrigin(0.5),
    );

    if (!unlocked) {
      return;
    }
    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => {
      card.setStrokeStyle(2, theme.player.a.fill, 1);
    });
    card.on('pointerout', () => {
      card.setStrokeStyle(2, theme.colors.plateEdge, 1);
    });
    card.on('pointerdown', () => {
      armAudio();
      playSound('ui');
      this.scene.start('PlayScene', {
        mode: 'ai',
        mapId: mission.mapId,
        difficulty: mission.difficulty,
        missionId: mission.id,
      });
    });
  }

  private drawMapCard(map: MapDefinition, x: number, y: number): void {
    if (!isMapId(map.id)) {
      throw new Error(`MAP_LIST contains unknown id ${map.id}`);
    }
    const mapId: MapId = map.id;
    const card = this.keep(this.add.rectangle(x, y, 296, 128, theme.colors.plateInner, 0.88));
    card.setStrokeStyle(2, theme.colors.plateEdge, 1);
    this.drawSchematic(mapId, x, y - 18);
    this.keep(
      this.add
        .text(x, y + 28, map.name, {
          fontFamily: theme.fonts.display,
          fontSize: '15px',
          color: theme.colors.hudText,
          fontStyle: '700',
        })
        .setOrigin(0.5),
    );
    const cardText = mapCardText(map);
    this.keep(
      this.add
        .text(x, y + 44, cardText.counts, {
          fontFamily: theme.fonts.mono,
          fontSize: '13px',
          color: theme.colors.hudMuted,
        })
        .setOrigin(0.5),
    );
    // The reveal rule is a RULE, not a map fact: every map with plates names it.
    if (cardText.reveal !== '') {
      this.keep(
        this.add
          .text(x, y + 58, cardText.reveal, {
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            color: theme.colors.hudText,
          })
          .setOrigin(0.5),
      );
    }
    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => {
      card.setStrokeStyle(2, theme.player.a.fill, 1);
    });
    card.on('pointerout', () => {
      card.setStrokeStyle(2, theme.colors.plateEdge, 1);
    });
    card.on('pointerdown', () => {
      armAudio();
      playSound('ui');
      if (this.skirmishDifficulty === 'hotseat') {
        this.scene.start('PlayScene', { mode: 'hotseat', mapId });
        return;
      }
      this.scene.start('PlayScene', {
        mode: 'ai',
        mapId,
        difficulty: this.skirmishDifficulty,
      });
    });
  }

  private drawSchematic(mapId: MapId, x: number, y: number): void {
    const board = createBoard(MAPS[mapId]);
    const layout = layoutBoard(board, { x: x - 88, y: y - 40, width: 176, height: 68 });
    for (const cell of Object.values(board.cells)) {
      const pos = cellCenter(layout, cell.x, cell.y);
      const tint = cell.deep ? theme.colors.deep : theme.colors.plateEdge;
      this.keep(this.add.rectangle(pos.x, pos.y, layout.cellSize - 1, layout.cellSize - 1, tint, 0.95));
    }
    for (const wallId of boardPlates(board)) {
      const pos = parseCellId(wallId);
      const center = cellCenter(layout, pos.x, pos.y);
      const tint = isArmoredPlate(board, wallId) ? theme.colors.wallArmor : theme.colors.wallEdge;
      this.keep(this.add.rectangle(center.x, center.y, layout.cellSize - 1, layout.cellSize - 1, tint, 0.95));
    }
  }

  private drawTitleHalo(): void {
    const ring = this.add.circle(CANVAS_WIDTH / 2, 96, 118, theme.player.a.fill, 0);
    ring.setStrokeStyle(2, theme.player.a.fill, 0.35);
    const inner = this.add.circle(CANVAS_WIDTH / 2, 96, 72, theme.player.b.fill, 0);
    inner.setStrokeStyle(2, theme.player.b.fill, 0.28);
    this.tweens.add({
      targets: ring,
      scale: { from: 0.92, to: 1.08 },
      alpha: { from: 0.7, to: 0.2 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: inner,
      scale: { from: 1.06, to: 0.9 },
      alpha: { from: 0.25, to: 0.7 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private spawnEmbers(): void {
    const tints = [theme.player.a.fill, theme.player.b.fill, 0xd8c8a8];
    for (let i = 0; i < 36; i += 1) {
      const tint = tints[i % tints.length];
      if (tint === undefined) {
        throw new Error('ember tint missing');
      }
      const ember = this.add.circle(
        Math.random() * CANVAS_WIDTH,
        Math.random() * CANVAS_HEIGHT,
        1.5 + Math.random() * 2.2,
        tint,
        0.22,
      );
      ember.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ember,
        y: ember.y - 110,
        alpha: 0,
        duration: 3200 + Math.random() * 2200,
        repeat: -1,
        onRepeat: () => {
          ember.setPosition(Math.random() * CANVAS_WIDTH, CANVAS_HEIGHT - 40);
          ember.setAlpha(0.24);
        },
      });
    }
  }
}

function starLine(count: number): string {
  return `${count >= 1 ? '★' : '☆'} ${count >= 2 ? '★' : '☆'} ${count >= 3 ? '★' : '☆'}`;
}
