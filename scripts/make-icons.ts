import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, renderIcon, renderSpriteIcon } from './png';
import { FOREST_SPRITES } from '../src/forest-data/sprites';
import { LATE_SPRITES } from '../src/late-fees-data/sprites';
import { FATHOM_SPRITES } from '../src/fathom-data/sprites';

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

// FATHOM: a fin breaking a sonar ring, cyan on deep teal.
const FATHOM_PALETTE = { a: [8, 52, 66], b: [52, 214, 214], c: [210, 246, 250], d: [120, 200, 220], e: [255, 196, 64] };
mkdirSync('public/fathom/icons', { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
] as const) {
  const { width, height, rgba } = renderSpriteIcon(FATHOM_SPRITES.fin!, FATHOM_PALETTE, [3, 18, 26], size);
  writeFileSync(`public/fathom/icons/${file}`, encodePng(width, height, rgba));
  console.log(`wrote public/fathom/icons/${file}`);
}
