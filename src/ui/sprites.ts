import { SPRITES } from '../data/sprites';
import { h } from './dom';
import { corruptFrame, framePixels } from './pixels';

const PALETTE_VARS: Record<string, string> = {
  a: '--phosphor-faint',
  b: '--phosphor-dim',
  c: '--phosphor',
  d: '--phosphor-hi',
  e: '--corp',
};

export type Palette = Record<string, string>;

export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  return Object.fromEntries(Object.entries(PALETTE_VARS).map(([key, v]) => [key, style.getPropertyValue(v).trim() || '#5dff8f']));
}

export function spriteCanvas(name: string, className: string): HTMLCanvasElement {
  const sprite = SPRITES[name];
  if (!sprite) throw new Error(`Unknown sprite ${name}`);
  return h('canvas', {
    class: `sprite ${className}`,
    width: sprite.width,
    height: sprite.height,
    'data-sprite': name,
    'data-frame': 0,
    'data-testid': `sprite-${name}`,
    'aria-hidden': 'true',
  });
}

export function paintSprite(canvas: HTMLCanvasElement, palette: Palette, corruption = 0, rng = 0): void {
  const sprite = SPRITES[canvas.dataset.sprite ?? ''];
  const ctx = canvas.getContext('2d');
  if (!sprite || !ctx) return;
  const frameIndex = Number(canvas.dataset.frame ?? 0) % sprite.frames.length;
  const [frame] = corruptFrame(sprite.frames[frameIndex]!, rng, corruption);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of framePixels(frame)) {
    ctx.fillStyle = palette[p.key] ?? '#fff';
    ctx.fillRect(p.x, p.y, 1, 1);
  }
}

export function advanceFrame(canvas: HTMLCanvasElement): void {
  const sprite = SPRITES[canvas.dataset.sprite ?? ''];
  if (!sprite) return;
  canvas.dataset.frame = String((Number(canvas.dataset.frame ?? 0) + 1) % sprite.frames.length);
}

export function paintAll(root: HTMLElement, corruption = 0, rng = 0): void {
  const palette = readPalette(root);
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-sprite]').forEach((c, i) => paintSprite(c, palette, corruption, rng + i));
}
