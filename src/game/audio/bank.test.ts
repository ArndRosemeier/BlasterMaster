import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOUND_FILES } from './bank';

describe('SOUND_FILES', () => {
  it('points at a real clip under public/', () => {
    for (const relative of Object.values(SOUND_FILES)) {
      const path = resolve(process.cwd(), 'public', relative);
      expect(existsSync(path), path).toBe(true);
    }
  });
});
