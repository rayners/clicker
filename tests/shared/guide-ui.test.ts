// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createGuideProgress, type GuideRules, type GuideStep } from '../../src/shared/guide';
import { createGuideView } from '../../src/shared/ui/guide';

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
    await user.click(screen.getByRole('button', { name: /got it/i }));
    view.render({ drills: 0 });
    expect(screen.getByText('Then this.')).toBeTruthy();
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
});
