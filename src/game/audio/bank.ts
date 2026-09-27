export const SOUND_FILES = {
  ui: 'assets/sfx/ui.wav',
  place: 'assets/sfx/place.wav',
  wave: 'assets/sfx/wave.wav',
  leftover: 'assets/sfx/leftover.wav',
  collapse: 'assets/sfx/collapse.wav',
  win: 'assets/sfx/win.wav',
  lose: 'assets/sfx/lose.wav',
  title: 'assets/sfx/title.wav',
} as const;

export type SoundFileId = keyof typeof SOUND_FILES;
export type SoundId = Exclude<SoundFileId, 'title'>;

export const SFX_GAIN: Record<SoundId, number> = {
  ui: 0.42,
  place: 0.7,
  wave: 0.6,
  leftover: 0.38,
  collapse: 0.62,
  win: 0.5,
  lose: 0.48,
};

export const TITLE_GAIN = 0.3;
