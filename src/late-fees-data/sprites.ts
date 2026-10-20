import { sprite, type Sprite } from '../shared/pixels';

/** Palette keys: a shell, b label, c neon title, d spools, e the red REC dot. */
const tape = sprite([
  '..............',
  '.aaaaaaaaaaaa.',
  '.abbbbbbbbbba.',
  '.abccccccccba.',
  '.abbbbbbbbbba.',
  '.aaaaaaaaaaaa.',
  '.aadda..addaa.',
  '.adaada.daada.',
  '.aadda..addaa.',
  '.aaaaaaaaaaaa.',
  '.aaaaaeaaaaaa.',
  '..............',
]);

export const LATE_SPRITES: Readonly<Record<string, Sprite>> = { tape };
