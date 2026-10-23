import { corruptFrame, framePixels, type Sprite } from '../pixels';
import { h } from './dom';

export type Palette = Record<string, string>;

export interface SpriteKitOptions {
  sprites: Readonly<Record<string, Sprite>>;
  /** Palette key -> CSS custom property, read from the themed root at paint time. */
  paletteVars: Readonly<Record<string, string>>;
  fallback: string;
  /** Override the corruption for particular canvases (e.g. portraits of the lost). */
  corruptionFor?(canvas: HTMLCanvasElement, base: number): number;
}

/** Draws palette-indexed sprites onto canvases, tinted from CSS variables so themes re-colour them. */
export function createSpriteKit(options: SpriteKitOptions) {
  const { sprites, paletteVars, fallback } = options;

  function readPalette(el: Element): Palette {
    const style = getComputedStyle(el);
    return Object.fromEntries(Object.entries(paletteVars).map(([key, v]) => [key, style.getPropertyValue(v).trim() || fallback]));
  }

  function spriteCanvas(name: string, className: string): HTMLCanvasElement {
    const s = sprites[name];
    if (!s) throw new Error(`Unknown sprite ${name}`);
    return h('canvas', {
      class: `sprite ${className}`,
      width: s.width,
      height: s.height,
      'data-sprite': name,
      'data-frame': 0,
      'data-testid': `sprite-${name}`,
      'aria-hidden': 'true',
    });
  }

  function paintSprite(canvas: HTMLCanvasElement, palette: Palette, corruption = 0, rng = 0): void {
    const s = sprites[canvas.dataset.sprite ?? ''];
    const ctx = canvas.getContext('2d');
    if (!s || !ctx) return;
    const frameIndex = Number(canvas.dataset.frame ?? 0) % s.frames.length;
    const [frame] = corruptFrame(s.frames[frameIndex]!, rng, corruption);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of framePixels(frame)) {
      ctx.fillStyle = palette[p.key] ?? fallback;
      ctx.fillRect(p.x, p.y, 1, 1);
    }
  }

  /** Point a canvas at another sprite (a different vessel, a different target), resized and back to frame 0. */
  function setSprite(canvas: HTMLCanvasElement, name: string): void {
    const s = sprites[name];
    if (!s || canvas.dataset.sprite === name) return;
    canvas.width = s.width;
    canvas.height = s.height;
    canvas.dataset.sprite = name;
    canvas.dataset.frame = '0';
    canvas.dataset.testid = `sprite-${name}`;
  }

  function advanceFrame(canvas: HTMLCanvasElement): void {
    const s = sprites[canvas.dataset.sprite ?? ''];
    if (!s) return;
    canvas.dataset.frame = String((Number(canvas.dataset.frame ?? 0) + 1) % s.frames.length);
  }

  function paintAll(root: HTMLElement, corruption = 0, rng = 0): void {
    const palette = readPalette(root);
    root.querySelectorAll<HTMLCanvasElement>('canvas[data-sprite]').forEach((c, i) => {
      const amount = options.corruptionFor ? options.corruptionFor(c, corruption) : corruption;
      paintSprite(c, palette, amount, rng + i);
    });
  }

  return { readPalette, spriteCanvas, setSprite, paintSprite, advanceFrame, paintAll };
}
