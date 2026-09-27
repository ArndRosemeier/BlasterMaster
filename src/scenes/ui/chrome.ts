import Phaser from 'phaser';
import { theme } from '../../game/theme';

export function addWordmark(scene: Phaser.Scene, x: number, y: number, size: string): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, 'BLASTER MASTER', {
      fontFamily: theme.fonts.display,
      fontSize: size,
      color: theme.colors.hudText,
      fontStyle: '800',
    })
    .setOrigin(0.5);
}

export function makePanelButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  depth = 21,
  parent?: Phaser.GameObjects.Container,
): void {
  const bg = scene.add.rectangle(x, y, width, height, theme.colors.plateInner, 0.95).setDepth(depth);
  bg.setStrokeStyle(2, theme.colors.plateEdge, 1);
  const text = scene.add
    .text(x, y, label, {
      fontFamily: theme.fonts.display,
      fontSize: height >= 52 ? '18px' : '16px',
      color: theme.colors.hudText,
      fontStyle: '700',
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => {
    bg.setStrokeStyle(2, theme.player.a.fill, 1);
    scene.tweens.add({
      targets: [bg, text],
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 90,
    });
  });
  bg.on('pointerout', () => {
    bg.setStrokeStyle(2, theme.colors.plateEdge, 1);
    scene.tweens.add({
      targets: [bg, text],
      scaleX: 1,
      scaleY: 1,
      duration: 90,
    });
  });
  bg.on('pointerdown', onClick);
  text.setInteractive({ useHandCursor: true });
  text.on('pointerdown', onClick);
  parent?.add([bg, text]);
}
