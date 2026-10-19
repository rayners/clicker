import { describe, it, expect } from 'vitest';
import { ARCHIVE } from '../../src/data/archive';
import { createMission, DEFAULT_MISSION_CONFIG } from '../../src/mission/state';
import { unlockedFiles } from '../../src/mission/archive';

describe('archive files', () => {
  it('have unique ids, titles and bodies', () => {
    expect(new Set(ARCHIVE.map((f) => f.id)).size).toBe(ARCHIVE.length);
    for (const f of ARCHIVE) expect(f.title && f.body.length).toBeTruthy();
  });

  it('keeps Special Order 0-77 sealed until the story unseals it', () => {
    const m = createMission(DEFAULT_MISSION_CONFIG, 1);
    const sealed = unlockedFiles({ ...m, lifetimeOre: 1e12 }).map((f) => f.id);
    expect(sealed).not.toContain('special-order');
    const open = unlockedFiles({ ...m, flags: ['archive-0-77'] }).map((f) => f.id);
    expect(open).toContain('special-order');
  });

  it('starts with nothing unlocked', () => {
    expect(unlockedFiles(createMission(DEFAULT_MISSION_CONFIG, 1))).toEqual([]);
  });
});
