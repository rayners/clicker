import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, renderIcon } from './png';

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
