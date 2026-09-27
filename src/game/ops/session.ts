import { isAiDifficulty, type AiDifficulty } from '../ai/choose';
import { isMapId, type MapId } from '../maps';
import { isMissionId, type MissionId } from './campaign';

export type PlayMode = 'hotseat' | 'ai';

export type PlaySceneData =
  | {
      readonly mode: 'hotseat';
      readonly mapId: MapId;
    }
  | {
      readonly mode: 'ai';
      readonly mapId: MapId;
      readonly difficulty: AiDifficulty;
      readonly missionId?: MissionId;
    };

export function requirePlaySceneData(value: unknown): PlaySceneData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('PlayScene requires session data');
  }
  if (!('mode' in value) || !('mapId' in value)) {
    throw new Error('PlayScene requires mode and mapId');
  }
  const mode = value.mode;
  const mapId = value.mapId;
  if (typeof mapId !== 'string' || !isMapId(mapId)) {
    throw new Error(`PlayScene mapId is invalid: ${String(mapId)}`);
  }
  if (mode === 'hotseat') {
    return { mode, mapId };
  }
  if (mode === 'ai') {
    if (!('difficulty' in value) || typeof value.difficulty !== 'string' || !isAiDifficulty(value.difficulty)) {
      throw new Error('AI session requires a difficulty');
    }
    if ('missionId' in value && value.missionId !== undefined) {
      if (typeof value.missionId !== 'string' || !isMissionId(value.missionId)) {
        throw new Error(`Unknown mission "${String(value.missionId)}"`);
      }
      return { mode, mapId, difficulty: value.difficulty, missionId: value.missionId };
    }
    return { mode, mapId, difficulty: value.difficulty };
  }
  throw new Error(`PlayScene mode must be hotseat or ai, got ${String(mode)}`);
}
