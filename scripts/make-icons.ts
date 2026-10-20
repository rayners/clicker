import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, renderIcon, renderSpriteIcon } from './png';
import { FOREST_SPRITES } from '../src/forest-data/sprites';

mkdirSync('public/icons', { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
] as const) {
  const { width, height, rgba } = renderIcon('moonlet', size);
  writeFileSync(`public/icons/${file}`, encodePng(width, height, rgba));
  console.log(`wrote public/icons/${file}`);
}

// CHARTER OF THE ELDERDARK: a gilt key on candlelit umber.
const FOREST_PALETTE = { a: [61, 49, 34], b: [166, 150, 122], c: [234, 223, 196], d: [201, 162, 74], e: [184, 67, 47] };
mkdirSync('public/forest/icons', { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
] as const) {
  const { width, height, rgba } = renderSpriteIcon(FOREST_SPRITES.key!, FOREST_PALETTE, [18, 13, 8], size);
  writeFileSync(`public/forest/icons/${file}`, encodePng(width, height, rgba));
  console.log(`wrote public/forest/icons/${file}`);
}
