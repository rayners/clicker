import { sprite, type Sprite } from '../engine/pixels';

/** Palette keys: a deep water, b sonar ring, c the fin, d its edge, e the ping. */
const fin = sprite([
  '..............',
  '.....bbbb.....',
  '...bb....bb...',
  '..b...dc...b..',
  '.b....dcc...b.',
  '.b...dccc...b.',
  'b....dcccc...b',
  'b...dccccc...b',
  'b.aadccccccaab',
  '.baaaaaaaaaab.',
  '..bb..e...bb..',
  '....bbbbbb....',
]);

export const FATHOM_SPRITES: Readonly<Record<string, Sprite>> = { fin };
