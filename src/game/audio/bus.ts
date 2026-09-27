import { publicAsset } from '../../lib/publicAsset';
import { SOUND_FILES, SFX_GAIN, TITLE_GAIN, type SoundFileId, type SoundId } from './bank';

export type { SoundId } from './bank';

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function contextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const view = window as AudioWindow;
  return window.AudioContext ?? view.webkitAudioContext;
}

let ctx: AudioContext | null = null;
let loadPromise: Promise<void> | null = null;
const buffers = new Map<SoundFileId, AudioBuffer>();
const pending: Array<{ id: SoundId; waveIndex: number }> = [];
let titleSource: AudioBufferSourceNode | null = null;
let titleGain: GainNode | null = null;

function audio(): AudioContext {
  const Ctor = contextConstructor();
  if (Ctor === undefined) {
    throw new Error('Web Audio is not available in this environment');
  }
  if (ctx === null) {
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function fire(id: SoundId, waveIndex: number): void {
  const context = audio();
  const buffer = buffers.get(id);
  if (buffer === undefined) {
    throw new Error(`Sound ${id} is not in the bank`);
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  if (id === 'wave') {
    source.playbackRate.value = 1 + waveIndex * 0.12;
  }
  gain.gain.setValueAtTime(SFX_GAIN[id], context.currentTime);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

export function loadSoundBank(): Promise<void> {
  if (loadPromise !== null) {
    return loadPromise;
  }
  loadPromise = (async () => {
    const context = audio();
    const entries = Object.entries(SOUND_FILES) as Array<[SoundFileId, string]>;
    await Promise.all(
      entries.map(async ([id, relative]) => {
        const url = publicAsset(relative);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load sound ${id} from ${url}: ${response.status}`);
        }
        const raw = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(raw.slice(0));
        buffers.set(id, decoded);
      }),
    );
    const queued = pending.splice(0, pending.length);
    for (const item of queued) {
      fire(item.id, item.waveIndex);
    }
  })();
  return loadPromise;
}

export function playSound(id: SoundId, waveIndex = 0): void {
  if (!buffers.has(id)) {
    pending.push({ id, waveIndex });
    void loadSoundBank();
    return;
  }
  fire(id, waveIndex);
}

export function playTitleTheme(): void {
  const context = audio();
  const buffer = buffers.get('title');
  if (buffer === undefined) {
    void loadSoundBank().then(() => {
      playTitleTheme();
    });
    return;
  }
  if (titleSource !== null) {
    return;
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(TITLE_GAIN, context.currentTime + 0.8);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  titleSource = source;
  titleGain = gain;
}

export function stopTitleTheme(): void {
  if (titleSource === null || titleGain === null || ctx === null) {
    return;
  }
  const source = titleSource;
  const gain = titleGain;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  source.stop(now + 0.26);
  titleSource = null;
  titleGain = null;
}

export function armAudio(): void {
  audio();
  void loadSoundBank();
}
