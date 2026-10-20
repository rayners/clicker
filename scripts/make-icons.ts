import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, renderIcon, renderSpriteIcon } from './png';
import { FOREST_SPRITES } from '../src/forest-data/sprites';
import { LATE_SPRITES } from '../src/late-fees-data/sprites';

mkdirSync('public/contract/icons', { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
] as const) {
  const { width, height, rgba } = renderIcon('moonlet', size);
  writeFileSync(`public/contract/icons/${file}`, encodePng(width, height, rgba));
  console.log(`wrote public/contract/icons/${file}`);
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

// LATE FEES: a rental tape with a neon label on black.
const LATE_PALETTE = { a: [43, 33, 64], b: [244, 239, 255], c: [255, 43, 214], d: [43, 240, 255], e: [255, 50, 70] };
mkdirSync('public/late-fees/icons', { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
] as const) {
  const { width, height, rgba } = renderSpriteIcon(LATE_SPRITES.tape!, LATE_PALETTE, [7, 5, 12], size);
  writeFileSync(`public/late-fees/icons/${file}`, encodePng(width, height, rgba));
  console.log(`wrote public/late-fees/icons/${file}`);
}
