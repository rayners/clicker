import { formatNumber } from '../engine/format';
import type { Store } from '../core/store';
import { FABRICATORS, TROOPERS } from '../data/security/systems';
import {
  ammoSupply,
  fabricatorCost,
  force,
  isFabricatorRevealed,
  isTrooperRevealed,
  pushGain,
  sentryCost,
  sentryHold,
  trooperCost,
  trooperForce,
} from '../mission/security/economy';
import type { SecurityMission } from '../mission/state';
import { createBuyPanel } from '../engine/ui/buy-list';
import { CREDITS, unitItem, type Adds } from './buy';

const SENTRY_NAME = 'SENTRY GUN';

/** What one more adds to the push on the frontier or to the line, or why nothing. */
const addsPush = (g: { assault: number; hold: number }, why: string): Adds =>
  g.assault > 0 ? { text: `+${formatNumber(g.assault)} PUSH`, wasted: false } : g.hold > 0 ? { text: `+${formatNumber(g.hold)} LINE`, wasted: false } : { text: `+0 · ${why}`, wasted: true };

export function createSecuritySystemsPanel(store: Store): { el: HTMLElement; render(m: SecurityMission): void } {
  const fabricators = FABRICATORS.map((def, index) =>
    unitItem<SecurityMission>(def, {
      verb: 'Build',
      owned: (m) => m.fabricators[def.id] ?? 0,
      price: (m) => fabricatorCost(def, m.fabricators[def.id] ?? 0),
      each: () => `+${formatNumber(def.rate)} RDS/S EA`,
      adds: (m) => addsPush(pushGain(m, { fabricator: def.id }), 'AMMUNITION ENOUGH'),
      shown: (m) => isFabricatorRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyFabricator', id: def.id }),
    }),
  );
  const troopers = TROOPERS.map((def, index) =>
    unitItem<SecurityMission>(def, {
      verb: 'Deploy',
      owned: (m) => m.troopers[def.id] ?? 0,
      price: (m) => trooperCost(def, m.troopers[def.id] ?? 0),
      each: (m) => `${formatNumber(trooperForce(m, def))} FORCE EA`,
      adds: (m) => addsPush(pushGain(m, { trooper: def.id }), 'NOWHERE TO SEND THEM'),
      shown: (m) => isTrooperRevealed(m, index),
      onBuy: () => store.dispatch({ type: 'buyTrooper', id: def.id }),
    }),
  );
  const sentry = [
    unitItem<SecurityMission>(
      {
        id: 'sentry',
        name: SENTRY_NAME,
        description: 'Automated turrets on tripods. They hold a corridor without sleeping, eating or asking questions, and burn ammunition doing it.',
      },
      {
        verb: 'Install',
        owned: (m) => m.sentries,
        price: sentryCost,
        each: (m) => `HOLDS ${formatNumber(m.sentries > 0 ? sentryHold(m) / m.sentries : sentryHold({ ...m, sentries: 1 }))} EA`,
        adds: (m) => addsPush(pushGain(m, { sentry: true }), 'LINE ALREADY HELD'),
        onBuy: () => store.dispatch({ type: 'buySentry' }),
      },
    ),
  ];

  return createBuyPanel<SecurityMission>({
    title: 'DETACHMENT',
    funds: (m) => m.credits,
    currency: CREDITS,
    sections: [
      { heading: 'AMMUNITION', total: (m) => `${formatNumber(ammoSupply(m))} RDS/S`, items: fabricators },
      { heading: 'FORCE', total: (m) => formatNumber(force(m)), items: troopers },
      { heading: 'THE LINE', items: sentry },
    ],
  });
}
