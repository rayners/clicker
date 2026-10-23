// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGuideProgress, type GuideRules, type GuideStep } from '../../src/shared/guide';
import { createGuideView } from '../../src/shared/ui/guide';
import { TELEMETRY_EVENT, type TelemetryEvent } from '../../src/shared/telemetry';

interface S {
  drills: number;
}
const steps: GuideStep<S>[] = [
  { id: 'drill', title: 'DRILL', text: 'Tap the drill button.', target: '#drill', show: () => true, done: (s) => s.drills > 0 },
  { id: 'next', title: 'NEXT', text: 'Then this.', show: () => true, done: () => false },
];
const rules: GuideRules = { title: 'HOW EXTRACTION WORKS', sections: [{ heading: 'ORE', text: 'Drills dig ore.' }] };
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
};

function mount(storage = memory()) {
  document.body.innerHTML = '<button id="drill">DRILL</button>';
  const view = createGuideView<S>({ steps: () => steps, rules: () => rules, progress: createGuideProgress(storage, 'k') });
  document.body.append(view.el, view.rulesButton, view.rulesDialog);
  return { view, user: userEvent.setup() };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the guide on screen', () => {
  it('shows one tip at a time, and points at the control it is about', () => {
    const { view } = mount();
    view.render({ drills: 0 });
    const tip = within(screen.getByRole('region', { name: /guide/i }));
    expect(tip.getByText('Tap the drill button.')).toBeTruthy();
    expect(document.getElementById('drill')!.classList.contains('guide-target')).toBe(true);
  });

  it('sits as one line until tapped, then opens to the whole tip with GOT IT and SKIP GUIDE', async () => {
    const { view, user } = mount();
    view.render({ drills: 0 });
    const line = screen.getByRole('button', { name: /show the tip/i });
    expect(line.textContent).toMatch(/^DRILL/);
    expect(line.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /got it/i })).toBeNull();
    await user.click(line);
    expect(line.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /got it/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /skip guide/i })).toBeTruthy();
  });

  it('closes up again for each new tip', async () => {
    const { view, user } = mount();
    view.render({ drills: 0 });
    await user.click(screen.getByRole('button', { name: /show the tip/i }));
    view.render({ drills: 1 });
    expect(screen.getByRole('button', { name: /show the tip/i }).getAttribute('aria-expanded')).toBe('false');
  });

  it('moves on when the player does the thing, and lets go of the old control', () => {
    const { view } = mount();
    view.render({ drills: 0 });
    view.render({ drills: 1 });
    expect(screen.getByText('Then this.')).toBeTruthy();
    expect(document.getElementById('drill')!.classList.contains('guide-target')).toBe(false);
  });

  it('can be dismissed one tip at a time, or skipped altogether', async () => {
    const { view, user } = mount();
    view.render({ drills: 0 });
    await user.click(screen.getByRole('button', { name: /show the tip/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));
    view.render({ drills: 0 });
    expect(screen.getByText('Then this.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /show the tip/i }));
    await user.click(screen.getByRole('button', { name: /skip guide/i }));
    view.render({ drills: 0 });
    expect(screen.queryByRole('region', { name: /guide/i })).toBeNull();
  });

  it('keeps the rules a tap away, whatever the guide is doing', async () => {
    const { view, user } = mount();
    view.render({ drills: 0 });
    await user.click(screen.getByRole('button', { name: /how this works/i }));
    const dialog = within(screen.getByRole('dialog', { name: /how extraction works/i }));
    expect(dialog.getByText('Drills dig ore.')).toBeTruthy();
    await user.click(dialog.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /how extraction works/i })).toBeNull();
  });

  it('names each rules page by its own title when two guides share a page (a game and its horror tier)', () => {
    document.body.innerHTML = '';
    const a = createGuideView<S>({ steps: () => steps, rules: () => rules, progress: createGuideProgress(memory(), 'a') });
    const b = createGuideView<S>({ steps: () => steps, rules: () => ({ title: 'HOW THE WOOD WORKS', sections: [] }), progress: createGuideProgress(memory(), 'b') });
    document.body.append(a.rulesDialog, b.rulesDialog);
    a.render({ drills: 0 });
    b.render({ drills: 0 });
    a.rulesDialog.hidden = b.rulesDialog.hidden = false;
    expect(screen.getByRole('dialog', { name: 'HOW EXTRACTION WORKS' })).toBe(a.rulesDialog);
    expect(screen.getByRole('dialog', { name: 'HOW THE WOOD WORKS' })).toBe(b.rulesDialog);
  });

  it('announces each step as it is done or dismissed, and the guide being skipped, for telemetry', async () => {
    const heard: TelemetryEvent[] = [];
    const listen = (e: Event) => heard.push((e as CustomEvent<TelemetryEvent>).detail);
    document.addEventListener(TELEMETRY_EVENT, listen);
    const { view, user } = mount();
    view.render({ drills: 0 });
    view.render({ drills: 1 });
    expect(heard).toContainEqual({ name: 'guide_step', props: { guide: 'k', step: 'drill', how: 'done' } });
    await user.click(screen.getByRole('button', { name: /show the tip/i }));
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(heard).toContainEqual({ name: 'guide_step', props: { guide: 'k', step: 'next', how: 'dismissed' } });
    document.removeEventListener(TELEMETRY_EVENT, listen);
  });

  it('announces skipping the guide with the step it was on', async () => {
    const heard: TelemetryEvent[] = [];
    const listen = (e: Event) => heard.push((e as CustomEvent<TelemetryEvent>).detail);
    document.addEventListener(TELEMETRY_EVENT, listen);
    const { view, user } = mount();
    view.render({ drills: 0 });
    await user.click(screen.getByRole('button', { name: /show the tip/i }));
    await user.click(screen.getByRole('button', { name: /skip guide/i }));
    expect(heard).toContainEqual({ name: 'guide_skipped', props: { guide: 'k', step: 'drill' } });
    document.removeEventListener(TELEMETRY_EVENT, listen);
  });
});
