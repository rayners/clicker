import { sprite, type Sprite } from '../shared/pixels';

/**
 * Woodcut-style accents. Palette keys: a faint wash, b dim ink, c ink, d gilt, e rubric red.
 */
const treeline = sprite([
  '...............b.......................b........',
  '..............bcb.........b...........bcb.......',
  '....b........bcccb.......bcb.........bcccb....b.',
  '...bcb......bcccccb.....bcccb.......bcccccb..bcb',
  '..bcccb....bcccccccb...bcccccb.....bcccccccbbccc',
  '.bcccccb..bcccccccccb.bcccccccb...bcccccccccbccc',
  'bcccccccbbcccccccccccbcccccccccb.bcccccccccccccc',
  'cccccccccccccccccccccccccccccccccbcccccccccccccc',
  'ccccccccccccccccccccccccccccccccccccccccccccccc.',
  'acccacccccaccccaccccccacccccaccccccaccccaccccaca',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a',
]);

const key = sprite(
  [
    '...dddd.....',
    '..d....d....',
    '..d.ee.d....',
    '..d....d....',
    '...dddd.....',
    '....dd......',
    '....dd......',
    '....dddd....',
    '....dd......',
    '....ddd.....',
    '....dd......',
    '............',
  ],
  [
    '............',
    '...dddd.....',
    '..d....d....',
    '..d.ee.d....',
    '..d....d....',
    '...dddd.....',
    '....dd......',
    '....dd......',
    '....dddd....',
    '....dd......',
    '....ddd.....',
    '....dd......',
  ],
);

export const FOREST_SPRITES: Readonly<Record<string, Sprite>> = { treeline, key };
