import Phaser from 'phaser';
import { chooseAiMove, type AiDifficulty } from '../game/ai/choose';
import { playSound, stopTitleTheme } from '../game/audio/bus';
import { getCell, legalMoves, occupiedCount, tokenCount } from '../game/engine/board';
import { applyTurn, createGame } from '../game/engine/game';
import type { CellId, Game, Outcome, TurnSuccess, WaveStep } from '../game/engine/types';
import { requireMap } from '../game/maps';
import { missionById, nextMission, type Mission } from '../game/ops/campaign';
import { browserStore, recordStars } from '../game/ops/progress';
import { requirePlaySceneData, type PlaySceneData } from '../game/ops/session';
import { addTurn, awardStars, emptyStats, type MatchStats, type StarAward } from '../game/ops/stats';
import { CANVAS_HEIGHT, CANVAS_WIDTH, ownerLook, playerTheme, theme } from '../game/theme';
import { eaterPlan, type EaterCue } from '../game/view/eaterView';
import { previewPlacement } from '../game/view/preview';
import { BoardView } from './play/BoardView';
import { flyToken } from './play/fx';
import { publicAsset } from '../lib/publicAsset';
import { makePanelButton } from './ui/chrome';

export class PlayScene extends Phaser.Scene {
  private session!: PlaySceneData;
  private match!: Game;
  private boardView!: BoardView;
  private turnText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private coachText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private stats: MatchStats = emptyStats();
  private locked = false;
  private mission: Mission | null = null;

  public constructor() {
    super({ key: 'PlayScene' });
  }

  public init(data: unknown): void {
    this.session = requirePlaySceneData(data);
  }

  public preload(): void {
    if (!this.textures.exists('bg-play')) {
      this.load.image('bg-play', publicAsset('assets/bg-play.png'));
    }
  }

  public create(): void {
    const map = requireMap(this.session.mapId);
    this.match = createGame(map);
    this.stats = emptyStats();
    this.locked = false;
    this.mission = this.session.mode === 'ai' && this.session.missionId !== undefined
      ? missionById(this.session.missionId)
      : null;

    stopTitleTheme();
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg-play').setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.28);

    this.add
      .text(64, 32, 'BLASTER MASTER', {
        fontFamily: theme.fonts.display,
        fontSize: '20px',
        color: theme.colors.hudText,
        fontStyle: '800',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(64, 58, this.mission === null ? map.name : this.mission.title, {
        fontFamily: theme.fonts.mono,
        fontSize: '15px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0, 0.5);

    this.turnText = this.add
      .text(CANVAS_WIDTH - 64, 32, '', {
        fontFamily: theme.fonts.display,
        fontSize: '20px',
        color: theme.colors.hudText,
        fontStyle: '700',
      })
      .setOrigin(1, 0.5);
    this.scoreText = this.add
      .text(CANVAS_WIDTH - 64, 58, '', {
        fontFamily: theme.fonts.mono,
        fontSize: '15px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(1, 0.5);

    this.bannerText = this.add
      .text(CANVAS_WIDTH / 2, 96, '', {
        fontFamily: theme.fonts.display,
        fontSize: '28px',
        color: theme.player.a.hex,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.coachText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 28, this.footerLine(), {
        fontFamily: theme.fonts.mono,
        fontSize: '14px',
        color: theme.colors.hudMuted,
        wordWrap: { width: 980 },
        align: 'center',
      })
      .setOrigin(0.5);

    this.boardView = new BoardView(
      this,
      this.match.board,
      {
        x: 140,
        y: 108,
        width: CANVAS_WIDTH - 280,
        height: CANVAS_HEIGHT - 170,
      },
      (id) => {
        void this.tryPlace(id);
      },
      (id) => {
        this.handleHover(id);
      },
    );

    this.refreshHud();
    this.boardView.setLegal(this.match.currentPlayer, legalMoves(this.match.board, this.match.currentPlayer));
  }

  private footerLine(): string {
    if (this.mission !== null) {
      return this.mission.coach;
    }
    if (this.session.mode === 'hotseat') {
        return 'HOTSEAT  ·  FILL TO THE LINKS. LEFTOVER HOLDS.';
    }
    return `VS ${this.difficulty().toUpperCase()}  ·  YOU ARE AMBER`;
  }

  private difficulty(): AiDifficulty {
    if (this.session.mode !== 'ai') {
      throw new Error('difficulty() called in hotseat');
    }
    return this.session.difficulty;
  }

  private handleHover(id: CellId | null): void {
    if (this.locked || id === null || this.match.outcome.type !== 'ongoing') {
      this.boardView.clearPreview();
      return;
    }
    const preview = previewPlacement(this.match, id);
    if (preview === null) {
      this.boardView.clearPreview();
      return;
    }
    this.boardView.showPreview(id, preview);
  }

  private async tryPlace(id: CellId): Promise<void> {
    if (this.locked || this.match.outcome.type !== 'ongoing') {
      return;
    }
    if (this.session.mode === 'ai' && this.match.currentPlayer !== 'a') {
      return;
    }
    await this.commitMove(id);
  }

  private async commitMove(id: CellId): Promise<void> {
    const result = applyTurn(this.match, id);
    if (!result.ok) {
      return;
    }
    this.locked = true;
    this.boardView.clearPreview();
    this.boardView.setLegal(this.match.currentPlayer, []);
    playSound('place');
    this.boardView.pulseCell(id);
    await this.playTurn(result);
    this.stats = addTurn(this.stats, result);
    this.match = result.game;
    this.boardView.setBoard(this.match.board);
    this.refreshHud();

    if (this.match.outcome.type !== 'ongoing') {
      this.finishMatch();
      return;
    }
    if (this.session.mode === 'ai' && this.match.currentPlayer === 'b') {
      this.coachText.setText('REACTOR THINKING…');
      await this.wait(320);
      const pick = chooseAiMove(this.match, this.difficulty(), Math.random);
      await this.commitMove(pick);
      return;
    }
    if (this.session.mode === 'hotseat') {
      await this.passSeat();
    }
    this.coachText.setText(this.footerLine());
    this.boardView.setLegal(this.match.currentPlayer, legalMoves(this.match.board, this.match.currentPlayer));
    this.locked = false;
  }

  private async playTurn(result: TurnSuccess): Promise<void> {
    this.boardView.setBoard(result.afterPlacement);
    await this.wait(70);
    if (result.waves.length >= 2) {
      this.flashBanner(`CASCADE  ×${result.waves.length}`);
    }
    // The ORDER is the pure `eaterPlan`'s job. The engine hands back every wave and
    // then every eater step, which is not the order the player watches: the plan
    // interleaves them so a body glides before the blast that consumes it and rises
    // out of its square before its first move. Each cue is awaited, so no two
    // eater animations ever overlap each other or a wave.
    for (const cue of eaterPlan(result.waves, result.eaters, result.game.board)) {
      await this.playCue(cue, result);
    }
  }

  private async playCue(cue: EaterCue, result: TurnSuccess): Promise<void> {
    switch (cue.kind) {
      case 'wave': {
        const wave = result.waves[cue.index];
        if (wave !== undefined) {
          playSound('wave', cue.index);
          await this.playWave(wave, cue.index);
        }
        return;
      }
      case 'emerge':
        await this.boardView.emergeEater(cue.at, cue.shell);
        return;
      case 'move':
        await this.boardView.glideEater(cue.from, cue.to, cue.shell);
        return;
      case 'hold':
        this.boardView.holdEater(cue.at, cue.shell);
        return;
      case 'detonate':
        this.boardView.consumeEater(cue.at);
        return;
    }
  }

  private async playWave(wave: WaveStep, index: number): Promise<void> {
    // The wave names its own colour: a neutral flood (and an eater's detonation)
    // is nobody's, so it must never be painted with the mover's seat colour.
    const color = ownerLook(wave.spreader).fill;
    this.boardView.flash(wave.exploded);
    this.boardView.blast(wave.exploded, color, 1 + index * 0.28, wave.eaterDetonation);
    this.cameras.main.shake(100 + index * 28, 0.0038 + index * 0.0016);
    const flights = wave.transfers.map((transfer) => {
      const from = this.boardView.worldCenter(transfer.from);
      const to = this.boardView.worldCenter(transfer.to);
      return flyToken(this, from, to, transfer.owner, 260 + index * 20);
    });
    await Promise.all(flights);
    if (wave.eaterDetonation) {
      playSound('collapse');
      this.flashBanner('EATER DETONATES');
      await this.wait(200);
    }
    if (wave.collapsed.length > 0) {
      playSound('collapse');
      this.boardView.crackWalls(wave.collapsed);
      this.flashBanner(wave.collapsed.length > 1 ? `SEAM OPEN  ×${wave.collapsed.length}` : 'PLATE DOWN');
      await this.wait(170);
    }
    if (wave.cracked.length > 0) {
      playSound('collapse');
      this.boardView.damageWalls(wave.cracked);
      this.flashBanner(wave.cracked.length > 1 ? `ARMOR CRACKED  ×${wave.cracked.length}` : 'ARMOR CRACKED');
      await this.wait(170);
    }
    this.boardView.setBoard(wave.board);
    if (wave.exploded.some((id) => getCell(wave.board, id).count > 0)) {
      playSound('leftover');
    }
    await this.wait(50);
  }

  private flashBanner(text: string): void {
    this.bannerText.setText(text);
    this.bannerText.setAlpha(1);
    this.bannerText.setScale(0.86);
    this.tweens.add({
      targets: this.bannerText,
      scale: 1.08,
      duration: 160,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: this.bannerText,
      alpha: 0,
      duration: 900,
      delay: 280,
    });
  }

  private refreshHud(): void {
    const current = playerTheme(this.match.currentPlayer);
    const a = occupiedCount(this.match.board, 'a');
    const b = occupiedCount(this.match.board, 'b');
    this.turnText.setText(`${current.name} TURN`);
    this.turnText.setColor(current.hex);
    this.scoreText.setText(
      `AMBER ${a} CELLS · ${tokenCount(this.match.board, 'a')} CORE    CYAN ${b} CELLS · ${tokenCount(this.match.board, 'b')} CORE`,
    );
  }

  private finishMatch(): void {
    const outcome = this.match.outcome;
    if (outcome.type === 'ongoing') {
      throw new Error('finishMatch called while ongoing');
    }
    const humanWon = outcome.type === 'win' && outcome.player === 'a';
    const celebrate = outcome.type === 'win' && (this.session.mode === 'hotseat' || humanWon);
    playSound(celebrate ? 'win' : 'lose');

    let stars: StarAward = { earned: [] };
    if (this.mission !== null && outcome.type === 'win' && outcome.player === 'a') {
      stars = awardStars(outcome, this.stats, {
        swiftMoves: this.mission.swiftMoves,
        cascadeWaves: this.mission.cascadeWaves,
      });
      recordStars(browserStore(), this.mission.id, stars.earned.length);
    }

    this.showOutcome(outcome, stars);
  }

  private showOutcome(outcome: Outcome, stars: StarAward): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, theme.colors.overlay, 0.74).setDepth(20);
    if (outcome.type === 'ongoing') {
      throw new Error('showOutcome called while the match is ongoing');
    }
    const title =
      outcome.type === 'draw'
        ? 'STALEMATE'
        : outcome.cause === 'wipe'
          ? `WIPE  ·  ${playerTheme(outcome.player).name}`
          : `CYCLE  ·  ${playerTheme(outcome.player).name}`;
    const color = outcome.type === 'draw' ? theme.colors.hudText : playerTheme(outcome.player).hex;
    const aCells = occupiedCount(this.match.board, 'a');
    const bCells = occupiedCount(this.match.board, 'b');
    const subtitle =
      outcome.type === 'draw'
        ? `${aCells} CELLS APIECE`
        : `${aCells} CELLS TO ${bCells}`;
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 78, title, {
        fontFamily: theme.fonts.display,
        fontSize: '40px',
        color,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 38, subtitle, {
        fontFamily: theme.fonts.mono,
        fontSize: '16px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0.5)
      .setDepth(21);

    if (this.mission !== null) {
      const marks = `${stars.earned.includes('hold') ? '★' : '☆'}  ${stars.earned.includes('swift') ? '★' : '☆'}  ${stars.earned.includes('cascade') ? '★' : '☆'}`;
      this.add
        .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 4, marks, {
          fontFamily: theme.fonts.display,
          fontSize: '28px',
          color: theme.player.a.hex,
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.add
        .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 36, 'HOLD   SWIFT   CASCADE', {
          fontFamily: theme.fonts.mono,
          fontSize: '13px',
          color: theme.colors.hudMuted,
        })
        .setOrigin(0.5)
        .setDepth(21);
    }

    const y = this.mission === null ? CANVAS_HEIGHT / 2 + 56 : CANVAS_HEIGHT / 2 + 88;
    makePanelButton(this, CANVAS_WIDTH / 2 - 200, y, 180, 48, 'REMATCH', () => {
      this.scene.restart(this.session);
    });
    makePanelButton(this, CANVAS_WIDTH / 2, y, 180, 48, 'TITLE', () => {
      this.scene.start('TitleScene');
    });
    const upcoming = this.mission === null ? null : nextMission(this.mission.id);
    if (upcoming !== null && outcome.type === 'win' && outcome.player === 'a') {
      makePanelButton(this, CANVAS_WIDTH / 2 + 200, y, 180, 48, 'NEXT OP', () => {
        this.scene.restart({
          mode: 'ai',
          mapId: upcoming.mapId,
          difficulty: upcoming.difficulty,
          missionId: upcoming.id,
        });
      });
    }
  }

  private async passSeat(): Promise<void> {
    const next = playerTheme(this.match.currentPlayer);
    const veil = this.add.rectangle(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      theme.colors.overlay,
      0.62,
    );
    veil.setDepth(15);
    veil.setInteractive();
    const label = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 12, `${next.name}'S SEAT`, {
        fontFamily: theme.fonts.display,
        fontSize: '36px',
        color: next.hex,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setDepth(16);
    const hint = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 32, 'CLICK TO TAKE THE BOARD', {
        fontFamily: theme.fonts.mono,
        fontSize: '14px',
        color: theme.colors.hudMuted,
      })
      .setOrigin(0.5)
      .setDepth(16);
    await new Promise<void>((resolve) => {
      veil.once('pointerdown', () => {
        veil.destroy();
        label.destroy();
        hint.destroy();
        resolve();
      });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => {
        resolve();
      });
    });
  }

}

