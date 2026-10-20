import { h, setAttr } from '../shared/ui/dom';

const SIZE = 64;

/** Retro motion tracker: a sweeping arc with jittering blips, one per contact. */
export function createTracker(): { el: HTMLCanvasElement; render(contacts: number, time: number, colour: string): void } {
  const el = h('canvas', { class: 'tracker', width: SIZE, height: SIZE, role: 'img' });

  function render(contacts: number, time: number, colour: string) {
    setAttr(el, 'aria-label', `Motion tracker: ${contacts} contact${contacts === 1 ? '' : 's'}`);
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const c = SIZE / 2;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.35;
    for (const r of [10, 20, 30]) {
      ctx.beginPath();
      ctx.arc(c, SIZE - 2, r, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
    const sweep = Math.PI + ((time * 1.2) % Math.PI);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(c, SIZE - 2);
    ctx.lineTo(c + Math.cos(sweep) * 30, SIZE - 2 + Math.sin(sweep) * 30);
    ctx.stroke();
    for (let i = 0; i < Math.min(contacts, 24); i++) {
      // Stable pseudo-random placement per contact, drifting slowly closer.
      const angle = Math.PI + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * Math.PI;
      const dist = 28 - ((time * 0.6 + i * 7) % 24);
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 3 + i));
      ctx.fillRect(Math.round(c + Math.cos(angle) * dist) - 1, Math.round(SIZE - 2 + Math.sin(angle) * dist) - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  return { el, render };
}
