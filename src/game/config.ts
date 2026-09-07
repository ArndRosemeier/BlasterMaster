import Phaser from 'phaser';
import { PlayScene } from '../scenes/PlayScene';
import { TitleScene } from '../scenes/TitleScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './theme';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#050608',
  scene: [TitleScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
