import type { GameState } from '../core/game';
import { assignmentUnlock, availableAssignments, missionConfigFor } from '../core/prestige';
import type { Store } from '../core/store';
import type { ScenarioId } from '../mission/state';
import { createDialog } from '../engine/ui/dialog';
import { h, setText } from '../engine/ui/dom';

const BRIEFS: Record<ScenarioId, { title: string; name: string; brief: string }> = {
  overland: {
    title: 'OVERLAND HAUL · SHORT CONTRACT',
    name: 'overland',
    brief: 'The short way in, an hour or so. Drive a crawler rig and its trailers from the mine to the space elevator, depot by depot. Throttle against fuel, delivery windows, and a promotion at the end.',
  },
  extraction: {
    title: 'MINERAL EXTRACTION',
    name: 'extraction',
    brief: 'Strip-mine a moonlet and refine the ore. Keep the refinery ahead of the drills. Eleven years from home.',
  },
  terraform: {
    title: 'TERRAFORMING',
    name: 'terraforming',
    brief: 'Make a dead world habitable before four thousand colonists arrive. Split station power to keep processing on corporate spec.',
  },
  security: {
    title: 'COLONY SECURITY',
    name: 'security',
    brief: 'A colony has gone quiet. Take it back sector by sector with a Combine Security detachment, and hold what you take.',
  },
  haulage: {
    title: 'HAULAGE',
    name: 'haulage',
    brief: 'Tow a refinery train home station by station. Burn hot to make the delivery windows, but the fuel bill and the freight both feel it.',
  },
  salvage: {
    title: 'SALVAGE',
    name: 'salvage',
    brief: 'Strip a derelict colony transport compartment by compartment. Run the torch hot for faster salvage, but brace what you open, and a stressed hull breaches.',
  },
};

/** Where WARDEN chooses its next contract: on a new game, after a terminus, or on request from CFG. */
export function createAssignment(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const cards = (Object.keys(BRIEFS) as ScenarioId[]).map((id) => {
    const def = BRIEFS[id];
    const where = h('p', { class: 'assign-where' });
    const locked = h('p', { class: 'assign-locked' });
    const accept = h('button', { class: 'buy assign-go', type: 'button', 'aria-label': `Accept ${def.name} contract` }, 'ACCEPT ASSIGNMENT');
    accept.addEventListener('click', () => store.dispatch({ type: 'chooseAssignment', scenario: id, seed: (Math.random() * 2 ** 31) | 0 }));
    const el = h(
      'section',
      { class: 'assign-card', 'aria-label': def.title },
      h('h3', { class: 'term-title' }, def.title),
      where,
      h('p', { class: 'sys-desc' }, def.brief),
      locked,
      accept,
    );
    return { id, el, where, locked, accept };
  });
  const warning = h('p', { class: 'assign-warning' }, 'ABANDONING THE CURRENT CONTRACT EARNS NOTHING. IT WILL NOT BE RECORDED.');
  const cancel = h('button', { class: 'buy', type: 'button' }, 'CANCEL');
  cancel.addEventListener('click', () => store.dispatch({ type: 'cancelReassignment' }));
  // A contract has to be chosen; only a mid-contract request can be cancelled, by its own button.
  const dialog = createDialog({ title: 'CONTRACT ASSIGNMENT', className: 'cfg', variant: 'assign', titleClass: 'panel-title', closable: false });
  dialog.body.append(h('p', { class: 'term-intro' }, 'KESSLER-AMARI COMBINE // OPERATIONS INTELLIGENCE PLACEMENT'), ...cards.map((c) => c.el), warning, cancel);
  const el = dialog.el;

  function render(game: GameState) {
    dialog.set(!!game.assigning);
    if (!game.assigning) return;
    const offered = availableAssignments(game.profile);
    // Only a mid-contract request can be backed out of.
    const abandoning = game.assigning === 'reassign';
    warning.hidden = !abandoning;
    cancel.hidden = !abandoning;
    for (const c of cards) {
      // Closed contracts stay on the list, saying what opens them.
      const open = offered.includes(c.id);
      c.el.dataset.locked = String(!open);
      c.accept.hidden = !open;
      c.locked.hidden = open;
      const needed = assignmentUnlock(c.id);
      setText(c.locked, `UNLOCKS AFTER ${needed} CONTRACT${needed === 1 ? '' : 'S'}`);
      const config = missionConfigFor(game.profile, c.id);
      setText(c.where, `${config.shipName.toUpperCase()} // ${config.targetBody.toUpperCase()}`);
    }
  }

  return { el, render };
}
