import { SPRITES } from '../data/sprites';
import { createSpriteKit, type Palette } from '../shared/ui/sprites';

const LOST_CORRUPTION = 0.9;

export type { Palette };

export const { readPalette, spriteCanvas, setSprite, paintSprite, advanceFrame, paintAll } = createSpriteKit({
  sprites: SPRITES,
  paletteVars: { a: '--phosphor-faint', b: '--phosphor-dim', c: '--phosphor', d: '--phosphor-hi', e: '--corp' },
  fallback: '#5dff8f',
  // Portraits of lost crew are always badly degraded.
  corruptionFor: (canvas, base) => (canvas.closest('[data-status="lost"]') ? LOST_CORRUPTION : base),
});
