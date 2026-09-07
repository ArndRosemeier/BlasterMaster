import Phaser from 'phaser';
import { gameConfig } from './game/config';

function boot(): void {
  new Phaser.Game(gameConfig);
}

if (document.fonts === undefined) {
  boot();
} else {
  void document.fonts.ready.then(() => {
    boot();
  });
}
