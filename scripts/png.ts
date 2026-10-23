import { deflateSync } from 'node:zlib';
import { SPRITES } from '../src/data/sprites';
import type { Sprite } from '../src/engine/pixels';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(typed.length + 8);
  out.writeUInt32BE(data.length, 0);
  typed.copy(out, 4);
  out.writeUInt32BE(crc32(typed), typed.length + 4);
  return out;
}

/** Minimal RGBA PNG encoder: enough for build-time icons without a native canvas dependency. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BACKGROUND = [2, 8, 4];
const PALETTE: Record<string, number[]> = {
  a: [15, 61, 32],
  b: [42, 154, 82],
  c: [93, 255, 143],
  d: [201, 255, 217],
  e: [232, 255, 240],
};

/** Draw a sprite centred on an opaque square, scaled by whole pixels so it stays crisp. */
export function renderIcon(spriteName: string, size: number): { width: number; height: number; rgba: Uint8Array } {
  return renderSpriteIcon(SPRITES[spriteName]!, PALETTE, BACKGROUND, size);
}

/** Draws a palette-indexed sprite, scaled up with hard pixels, centred on an opaque square. */
export function renderSpriteIcon(
  sprite: Sprite,
  palette: Record<string, number[]>,
  background: number[],
  size: number,
): { width: number; height: number; rgba: Uint8Array } {
  const frame = sprite.frames[0]!;
  const scale = Math.floor((size * 0.7) / Math.max(sprite.width, sprite.height));
  const offsetX = Math.floor((size - sprite.width * scale) / 2);
  const offsetY = Math.floor((size - sprite.height * scale) / 2);
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) rgba.set([...background, 255], i * 4);
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = palette[row[x]!];
      if (!colour) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = offsetX + x * scale + dx;
          const py = offsetY + y * scale + dy;
          rgba.set([...colour, 255], (py * size + px) * 4);
        }
      }
    }
  });
  return { width: size, height: size, rgba };
}
