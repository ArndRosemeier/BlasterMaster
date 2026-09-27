import Phaser from 'phaser';
import type { PlayerId } from '../../game/engine/types';
import { playerTheme } from '../../game/theme';

export const FX_TEX = {
  coreA: 'fx-core-a',
  coreB: 'fx-core-b',
  glowA: 'fx-glow-a',
  glowB: 'fx-glow-b',
  spark: 'fx-spark',
} as const;

export function coreTexture(player: PlayerId): string {
  return player === 'a' ? FX_TEX.coreA : FX_TEX.coreB;
}

export function glowTexture(player: PlayerId): string {
  return player === 'a' ? FX_TEX.glowA : FX_TEX.glowB;
}

export function ensureFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(FX_TEX.coreA)) {
    return;
  }
  paintCore(scene, FX_TEX.coreA, 0xf0a030, 0xffe29a);
  paintCore(scene, FX_TEX.coreB, 0x30d0e0, 0xb8ffff);
  paintGlow(scene, FX_TEX.glowA, 0xffc56a);
  paintGlow(scene, FX_TEX.glowB, 0x7af0ff);
  paintSpark(scene, FX_TEX.spark);
}

export function spawnBlast(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  intensity: number,
): void {
  const flash = scene.add.circle(x, y, 16 * intensity, 0xffffff, 0.85);
  flash.setBlendMode(Phaser.BlendModes.ADD);
  flash.setDepth(10);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scale: 2.1,
    duration: 130,
    onComplete: () => {
      flash.destroy();
    },
  });

  const ring = scene.add.circle(x, y, 10, color, 0);
  ring.setStrokeStyle(3, color, 1);
  ring.setDepth(10);
  scene.tweens.add({
    targets: ring,
    scale: 3.4 * intensity,
    alpha: 0,
    duration: 320,
    ease: 'Cubic.Out',
    onComplete: () => {
      ring.destroy();
    },
  });

  const sparks = 8 + Math.round(intensity * 4);
  for (let i = 0; i < sparks; i += 1) {
    const spark = scene.add.image(x, y, FX_TEX.spark);
    spark.setTint(color);
    spark.setBlendMode(Phaser.BlendModes.ADD);
    spark.setDepth(11);
    spark.setScale(0.7 + intensity * 0.25);
    const angle = (i / sparks) * Math.PI * 2 + intensity * 0.2;
    const dist = 28 + intensity * 22;
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.15,
      duration: 240 + intensity * 40,
      ease: 'Cubic.Out',
      onComplete: () => {
        spark.destroy();
      },
    });
  }
}

export function spawnImpact(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const hit = scene.add.circle(x, y, 7, color, 0.9);
  hit.setBlendMode(Phaser.BlendModes.ADD);
  hit.setDepth(10);
  scene.tweens.add({
    targets: hit,
    scale: 2.4,
    alpha: 0,
    duration: 160,
    onComplete: () => {
      hit.destroy();
    },
  });
}

export function flyToken(
  scene: Phaser.Scene,
  from: { x: number; y: number },
  to: { x: number; y: number },
  player: PlayerId,
  duration: number,
): Promise<void> {
  ensureFxTextures(scene);
  const look = playerTheme(player);
  const body = scene.add.image(from.x, from.y, coreTexture(player));
  const glow = scene.add.image(from.x, from.y, glowTexture(player));
  body.setDisplaySize(22, 22).setDepth(9);
  glow.setDisplaySize(40, 40).setDepth(8);
  glow.setBlendMode(Phaser.BlendModes.ADD);
  glow.setAlpha(0.85);

  const trail = scene.time.addEvent({
    delay: 26,
    repeat: Math.max(0, Math.floor(duration / 26) - 1),
    callback: () => {
      const ghost = scene.add.image(body.x, body.y, coreTexture(player));
      ghost.setDisplaySize(13, 13);
      ghost.setTint(look.glow);
      ghost.setAlpha(0.38);
      ghost.setBlendMode(Phaser.BlendModes.ADD);
      ghost.setDepth(7);
      scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scale: 0.35,
        duration: 170,
        onComplete: () => {
          ghost.destroy();
        },
      });
    },
  });

  return new Promise((resolve) => {
    scene.tweens.add({
      targets: [body, glow],
      x: to.x,
      y: to.y,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => {
        trail.remove(false);
        body.destroy();
        glow.destroy();
        spawnImpact(scene, to.x, to.y, look.fill);
        resolve();
      },
    });
  });
}

function paintCore(scene: Phaser.Scene, key: string, fill: number, shine: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(fill, 0.22);
  g.fillCircle(32, 32, 28);
  g.fillStyle(fill, 0.55);
  g.fillCircle(32, 32, 20);
  g.fillStyle(fill, 1);
  g.fillCircle(32, 32, 15);
  g.fillStyle(shine, 0.95);
  g.fillCircle(26, 25, 5);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(24, 23, 2.2);
  g.generateTexture(key, 64, 64);
  g.destroy();
}

function paintGlow(scene: Phaser.Scene, key: string, color: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(color, 0.08);
  g.fillCircle(48, 48, 46);
  g.fillStyle(color, 0.16);
  g.fillCircle(48, 48, 34);
  g.fillStyle(color, 0.32);
  g.fillCircle(48, 48, 22);
  g.generateTexture(key, 96, 96);
  g.destroy();
}

function paintSpark(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 3.4);
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(8, 8, 6);
  g.generateTexture(key, 16, 16);
  g.destroy();
}
