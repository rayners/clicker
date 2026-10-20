import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { encodePng, renderIcon, renderSpriteIcon } from '../scripts/png';
import { FOREST_SPRITES } from '../src/forest-data/sprites';

describe('icon PNG encoder', () => {
  it('writes a PNG signature and a header with the right size', () => {
    const png = encodePng(3, 2, new Uint8Array(3 * 2 * 4));
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(3);
    expect(png.readUInt32BE(20)).toBe(2);
  });

  it('stores the pixels so they decompress back to the same rows', () => {
    const rgba = Uint8Array.from({ length: 2 * 2 * 4 }, (_, i) => i * 10);
    const png = encodePng(2, 2, rgba);
    const idatStart = png.indexOf('IDAT') + 4;
    const length = png.readUInt32BE(idatStart - 8);
    const raw = inflateSync(png.subarray(idatStart, idatStart + length));
    // Each row is a filter byte (0) followed by the RGBA bytes.
    expect([...raw]).toEqual([0, ...rgba.subarray(0, 8), 0, ...rgba.subarray(8, 16)]);
  });

  it('renders a sprite icon at the requested size on an opaque background', () => {
    const { width, height, rgba } = renderIcon('moonlet', 64);
    expect(width).toBe(64);
    expect(height).toBe(64);
    expect(rgba[3]).toBe(255);
    const center = (32 * 64 + 32) * 4;
    expect(rgba[center + 1]).toBeGreaterThan(rgba[center]!); // phosphor green
  });
});

describe('icons for the second game', () => {
  it('renders any sprite in its own palette on its own background', () => {
    const { rgba } = renderSpriteIcon(FOREST_SPRITES.key!, { d: [201, 162, 74], e: [184, 67, 47] }, [18, 13, 8], 64);
    expect([...rgba.subarray(0, 3)]).toEqual([18, 13, 8]);
    const gilt = [...rgba].some((_, i) => i % 4 === 0 && rgba[i] === 201 && rgba[i + 1] === 162);
    expect(gilt).toBe(true);
  });
});
