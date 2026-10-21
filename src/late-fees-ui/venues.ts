import { formatNumber } from '../shared/format';
import { h } from '../shared/ui/dom';
import { createFlow } from '../shared/ui/flow';
import { frontier } from '../shared/ground';
import { ZONES } from '../late-fees-data/camp';
import {
  DAY_LENGTH,
  NIGHT_FROM,
  incomeRate,
  isNight,
  lightDemand,
  lightSupply,
  prepForce,
  staff,
  watchForce,
  watchNeeded,
  whistlePower,
} from '../late-fees/camp/economy';
import type { CampRun, Run } from '../late-fees/state';
import type { LateAction, LateStore } from '../late-fees/store';
import { createSplit, createStaffPanel, createStorePanel, createZones } from './camp';
import { createClinicUi } from './clinic';
import { createInsurerUi } from './insurer';

export interface Component {
  el: HTMLElement;
  render(r: Run): void;
}

/** Everything the shell needs from a venue to show it. */
export interface VenueUi {
  flow: Component;
  /** The fourth status figure (time of day at the camp, sleep debt at the clinic). */
  clock: { label: string; aria: string; read(r: Run): string };
  action: { label: string; aria: string; action: LateAction; perPress(r: Run): number };
  /** Controls above the log on the main panel. */
  main: Component;
  /** The buying tab: its label, and its contents. */
  staffTab: string;
  staff: Component;
  store: Component & { hasAffordable(r: Run): boolean };
  /** Whether the REC light is on. */
  night(r: Run): boolean;
}

export function createCampUi(store: LateStore): VenueUi {
  const c = (r: Run) => r as CampRun;
  const flow = createFlow<CampRun>({
    cells: [
      { label: 'LIGHT', aria: 'Light', unit: 'LM' },
      { label: 'PREP', aria: 'Prep work', unit: 'STAFF' },
      { label: 'TAKINGS', aria: 'Takings', unit: '$/S' },
    ],
    meterLabel: 'Next zone prepared',
    rateUnit: '$/S',
    identity: (r) => `${r.config.title}:${r.seed}`,
    read: (r) => {
      const line = frontier(r.zones);
      const base = {
        values: [lightSupply(r), prepForce(r), incomeRate(r)] as [number, number, number],
        meter: line < ZONES.length ? r.zones[line]!.control * 100 : 100,
        rate: incomeRate(r),
      };
      const need = watchNeeded(r);
      if (staff(r) === 0) return { ...base, limit: 'staff', highlight: 1, severe: false, note: 'NO STAFF · BLOW THE WHISTLE OR HIRE COUNSELORS' };
      if (watchForce(r) < need) {
        return { ...base, limit: 'watch', highlight: 2, severe: true, note: `NOT ENOUGH ON WATCH · ${formatNumber(watchForce(r))} OF ${formatNumber(need)} · ZONES GOING DARK` };
      }
      if (lightDemand(r) > lightSupply(r)) {
        return { ...base, limit: 'light', highlight: 0, severe: true, note: `TOO DARK TO WORK · ${formatNumber(lightDemand(r) - lightSupply(r))} LM SHORT · BUY LIGHTS` };
      }
      if (line >= ZONES.length) return { ...base, limit: 'open', highlight: null, severe: false, note: 'EVERY ZONE OPEN · ALL THE WAY TO WHERE HE DROWNED' };
      return { ...base, limit: 'staff', highlight: 1, severe: false, note: `PREPPING ${ZONES[line]!.name}` };
    },
  });
  const split = createSplit(store);
  const zones = createZones();
  const staffPanel = createStaffPanel(store);
  const storePanel = createStorePanel(store);
  return {
    flow: { el: flow.el, render: (r) => flow.render(c(r)) },
    clock: {
      label: 'TIME',
      aria: 'Time of day',
      read: (r) => {
        const into = r.elapsed % DAY_LENGTH;
        return isNight(c(r)) ? `NIGHT · ${Math.ceil((DAY_LENGTH - into) / 60)}M TO DAWN` : `DAY · ${Math.ceil((NIGHT_FROM - into) / 60)}M TO DUSK`;
      },
    },
    action: { label: 'BLOW THE WHISTLE', aria: 'Blow the whistle', action: { type: 'whistle' }, perPress: (r) => whistlePower(c(r)) },
    main: {
      el: h('div', { class: 'venue-main' }, split.el, zones.el),
      render: (r) => {
        split.render(c(r));
        zones.render(c(r));
      },
    },
    staffTab: 'STAFF',
    staff: { el: staffPanel.el, render: (r) => staffPanel.render(c(r)) },
    store: { el: storePanel.el, render: (r) => storePanel.render(c(r)), hasAffordable: (r) => storePanel.hasAffordable(c(r)) },
    night: (r) => isNight(c(r)),
  };
}

export function createVenueUis(store: LateStore): Record<Run['venue'], VenueUi> {
  return { camp: createCampUi(store), clinic: createClinicUi(store), insurer: createInsurerUi(store) };
}
