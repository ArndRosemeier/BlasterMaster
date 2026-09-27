import { z } from 'zod';
import { CAMPAIGN, type MissionId } from './campaign';

export const PROGRESS_KEY = 'blaster-master-ops';

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type Progress = {
  readonly version: 1;
  readonly stars: Readonly<Partial<Record<MissionId, number>>>;
};

const progressSchema = z.object({
  version: z.literal(1),
  stars: z.record(z.string(), z.number().int().min(0).max(3)),
});

export class ProgressCorruptError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ProgressCorruptError';
  }
}

export function emptyProgress(): Progress {
  return { version: 1, stars: {} };
}

export function loadProgress(store: KeyValueStore): Progress {
  const raw = store.getItem(PROGRESS_KEY);
  if (raw === null) {
    return emptyProgress();
  }
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ProgressCorruptError(
      error instanceof Error ? error.message : 'Progress JSON is not parseable',
    );
  }
  const parsed = progressSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProgressCorruptError(parsed.error.message);
  }
  return { version: 1, stars: parsed.data.stars };
}

export function loadProgressOrReset(store: KeyValueStore): Progress {
  try {
    return loadProgress(store);
  } catch (error) {
    if (error instanceof ProgressCorruptError) {
      const fresh = emptyProgress();
      saveProgress(store, fresh);
      return fresh;
    }
    throw error;
  }
}

export function saveProgress(store: KeyValueStore, progress: Progress): void {
  store.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function starsFor(progress: Progress, missionId: MissionId): number {
  return progress.stars[missionId] ?? 0;
}

export function isMissionUnlocked(progress: Progress, missionId: MissionId): boolean {
  const mission = CAMPAIGN.find((entry) => entry.id === missionId);
  if (mission === undefined) {
    throw new Error(`Unknown mission "${missionId}"`);
  }
  if (mission.index === 0) {
    return true;
  }
  const previous = CAMPAIGN[mission.index - 1];
  if (previous === undefined) {
    throw new Error(`Campaign is missing mission before ${missionId}`);
  }
  return starsFor(progress, previous.id) >= 1;
}

export function recordStars(store: KeyValueStore, missionId: MissionId, earned: number): Progress {
  if (!Number.isInteger(earned) || earned < 0 || earned > 3) {
    throw new Error(`Star count must be 0..3, got ${earned}`);
  }
  const current = loadProgressOrReset(store);
  const previous = starsFor(current, missionId);
  const next: Progress = {
    version: 1,
    stars: {
      ...current.stars,
      [missionId]: Math.max(previous, earned),
    },
  };
  saveProgress(store, next);
  return next;
}

export function memoryStore(initial: Readonly<Record<string, string>> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

export function browserStore(): KeyValueStore {
  return window.localStorage;
}
