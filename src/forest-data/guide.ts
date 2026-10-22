import type { GuideRules, GuideStep } from '../shared/guide';
import type { ForestGame } from '../forest/game';

/** Elderdark's walkthrough (docs/ROADMAP.md, item 6b): the Factor's levers in the order they matter, forest or Keep. */
type Step = GuideStep<ForestGame>;

const charter = (g: ForestGame) => g.mode === 'charter';
const inForest = (g: ForestGame) => charter(g) && g.company.site === 'forest';
const inKeep = (g: ForestGame) => charter(g) && g.company.site === 'keep';
const hands = (g: ForestGame) => Object.values(g.company.hired).reduce((a, b) => a + b, 0);
const sent = (g: ForestGame) => g.company.nextPartyId > 1;

const SHARED_START: Step[] = [
  {
    id: 'forage',
    title: 'FORAGE',
    text: 'Tap to forage the eaves yourself. Relics go to the vault, and the Collegium buyers turn them into thalers.',
    target: '.forage',
    show: charter,
    done: (g) => g.company.lifetimeRelics > 0,
  },
  {
    id: 'hire',
    title: 'HIRE HANDS',
    text: 'In ROSTER, hire blades, menders and scouts. Every hand draws wages whether out or in the hall, so hire for the parties you will send.',
    target: '#tab-roster',
    show: (g) => charter(g) && g.company.silver >= 20,
    done: (g) => hands(g) > 0,
  },
];

const FOREST: Step[] = [
  {
    id: 'send',
    title: 'SEND A PARTY',
    text: 'In EXPEDITIONS, set the standing order for a region (who goes) and send it. Strength against danger decides how many come home, and with how much.',
    target: '#tab-expeditions',
    show: (g) => inForest(g) && hands(g) > 0,
    done: sent,
  },
  {
    id: 'chart',
    title: 'CHART THE WAY DEEPER',
    text: 'Parties back from a region chart the way to the next. Deeper regions pay more, are more dangerous, and bring back more blight.',
    target: '#tab-expeditions',
    show: (g) => inForest(g) && sent(g),
    done: (g) => g.company.charted >= 2,
  },
];

const KEEP_STEPS: Step[] = [
  {
    id: 'keep-oil',
    title: 'LAMP OIL',
    text: 'Every hand sent into Morrowgate Keep burns oil. A party short of it goes into the dark, and far more of them are hurt.',
    target: '[aria-label="Buy oil for one trip"]',
    show: (g) => inKeep(g) && hands(g) > 0,
    done: (g) => g.company.oil > 0,
  },
  {
    id: 'keep-assault',
    title: 'TAKE A FLOOR',
    text: 'Send the assault order at the frontier floor. Each returning party pushes it a little; taking it deepens the delve.',
    target: '#tab-expeditions',
    show: (g) => inKeep(g) && g.company.oil > 0,
    done: sent,
  },
  {
    id: 'keep-post',
    title: 'HOLD WHAT YOU TAKE',
    text: 'Post blades on a taken floor. Unguarded floors slip back to the Keep; held floors pay from their stores.',
    target: '#tab-expeditions',
    show: (g) => inKeep(g) && g.company.floors.some((f) => f.secured),
    done: (g) => g.company.posted.some((n) => n > 0),
  },
];

const SHARED_END: Step[] = [
  {
    id: 'flow',
    title: 'THE LEDGER LINE',
    text: 'The three boxes at the top are the company\'s line: gathering, appraisal, coffers. The highlighted one is what holds you back.',
    target: '[aria-label="Production flow"]',
    show: (g) => charter(g) && g.company.elapsed > 90,
    done: () => false,
  },
  {
    id: 'standing',
    title: 'STANDING ORDERS',
    text: 'Once the Quartermaster can, a standing order sends a region\'s party by itself every time the hands are home.',
    target: '#tab-expeditions',
    show: (g) => charter(g) && g.company.upgrades.length > 0 && g.company.standing.length === 0,
    done: (g) => g.company.standing.length > 0,
  },
  {
    id: 'blight',
    title: 'BLIGHT',
    text: 'The wood comes home on the hands. High blight turns them; the Synod\'s penance, in the HALL, washes some of it away.',
    target: '#tab-hall',
    show: (g) => charter(g) && g.company.blight >= 20,
    done: () => false,
  },
];

export function forestGuideSteps(g: ForestGame): readonly Step[] {
  return [...SHARED_START, ...(g.company.site === 'keep' ? KEEP_STEPS : FOREST), ...SHARED_END];
}

const RULES: Record<'forest' | 'keep', GuideRules> = {
  forest: {
    title: 'HOW THE CHARTER WORKS',
    sections: [
      { heading: 'RELICS TO THALERS', text: 'Parties bring relics back from the wood; the Collegium appraises them into thalers. The slower of gathering and appraisal sets your income.' },
      { heading: 'PARTIES', text: 'A party\'s strength (blades fight, menders keep them alive, scouts are quicker and find more) is set against a region\'s danger. Outmatched, fewer come home.' },
      { heading: 'WAGES', text: 'Every hand is paid every second. An unpaid company deserts.' },
      { heading: 'BLIGHT', text: 'Each trip brings blight home. Past the turning line, hands turn. Penance washes it down.' },
      { heading: 'THE KEY', text: 'Fragments of the Ashen Key lie deep in the wood. The charter ends at the reckoning.' },
    ],
  },
  keep: {
    title: 'HOW THE KEEP WORKS',
    sections: [
      { heading: 'FLOORS', text: 'Morrowgate Keep is taken floor by floor from the gatehouse down. Returning assaults push the frontier floor; taking it deepens the delve.' },
      { heading: 'OIL', text: 'Every hand burns lamp oil going down and back. Short of oil, the party goes into the dark.' },
      { heading: 'GARRISONS', text: 'Posted blades hold a floor. Unheld floors slip back; held floors pay from their stores. A floor held too long keeps its garrison.' },
      { heading: 'SAPPERS', text: 'Sappers bring down the barricades of a floor nobody has broken into, multiplying that first assault.' },
    ],
  },
};

export const forestGuideRules = (g: ForestGame): GuideRules => RULES[g.company.site];
