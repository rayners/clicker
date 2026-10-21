import { describe, it, expect } from 'vitest';
import { SPRITES, PALETTE_KEYS } from '../../src/data/sprites';
import { CREW } from '../../src/data/crew';

describe('sprite table', () => {
  for (const [name, sprite] of Object.entries(SPRITES)) {
    it(`${name}: every frame matches its declared size and uses only palette characters`, () => {
      expect(sprite.frames.length).toBeGreaterThan(0);
      for (const frame of sprite.frames) {
        expect(frame.length).toBe(sprite.height);
        for (const row of frame) {
          expect(row.length).toBe(sprite.width);
          for (const ch of row) expect(PALETTE_KEYS).toContain(ch);
        }
      }
    });
  }

  it('has a distinct portrait for every crew member', () => {
    const portraits = CREW.map((c) => SPRITES[`crew-${c.id}`]);
    portraits.forEach((p) => expect(p).toBeDefined());
    const unique = new Set(portraits.map((p) => p!.frames[0]!.join('\n')));
    expect(unique.size).toBe(CREW.length);
  });

  it('has the ship, drill and moonlet accents', () => {
    expect(SPRITES.ship).toBeDefined();
    expect(SPRITES.drill!.frames.length).toBeGreaterThan(1);
    expect(SPRITES.moonlet).toBeDefined();
  });

  it('has accents for the hauls: a crawler rig, the lift, an engine; a tug and train, a station, a thruster', () => {
    for (const name of ['crawler', 'lift', 'piston', 'tug', 'station', 'thruster']) expect(SPRITES[name], name).toBeDefined();
    expect(SPRITES.piston!.frames.length).toBeGreaterThan(1);
    expect(SPRITES.thruster!.frames.length).toBeGreaterThan(1);
  });
});
