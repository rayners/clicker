import type { GuideRules, GuideStep } from '../shared/guide';
import type { FathomGame } from '../fathom/game';
import { DEFAULT_ENHANCE, DEFAULT_OPEN, DEFAULT_RANGE, DEFAULT_STATION_DEPTH } from '../fathom/state';
import { isShelfOpen } from '../fathom/shelf';
import { isOpenWaterOpen } from '../fathom/open-water';
import { isTrenchOpen } from '../fathom/trench';
import { isBreachOpen } from '../fathom/breach';

/** DOWN THERE's walkthrough (docs/ROADMAP.md, item 6b): each zone's levers as the water opens up. */
type Step = GuideStep<FathomGame>;

const season = (g: FathomGame) => g.mode === 'season';
const count = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

const STEPS: Step[] = [
  {
    id: 'pass',
    title: 'SELL A BEACH PASS',
    text: 'Tap to sell passes by hand while the beach is quiet. The town pays the outfit to keep the water safe.',
    target: '.pass',
    show: season,
    done: (g) => g.outfit.lifetimeCash > 0,
  },
  {
    id: 'attractions',
    title: 'ATTRACTIONS',
    text: 'In BEACH, attractions bring tourists who pay every second the beach is open.',
    target: '#fa-tab-beach',
    show: (g) => season(g) && g.outfit.lifetimeCash > 0,
    done: (g) => count(g.outfit.attractions) > 0,
  },
  {
    id: 'guards',
    title: 'WATCH THE WATER',
    text: 'Every swimmer needs watching. Guards cover the water; unwatched swimmers are what the water takes, and the town\'s trust goes with them.',
    target: '#fa-tab-beach',
    show: (g) => season(g) && count(g.outfit.attractions) > 0,
    done: (g) => count(g.outfit.guards) > 0,
  },
  {
    id: 'open',
    title: 'HOW MUCH BEACH',
    text: 'The dial sets how much beach is open. More pays more, and needs more watching. Close some when the guards fall behind.',
    target: '[aria-label="BEACH OPEN dial"]',
    show: (g) => season(g) && count(g.outfit.guards) > 0,
    done: (g) => g.outfit.open !== DEFAULT_OPEN,
  },
  {
    id: 'shelf',
    title: 'THE SHELF',
    text: 'Deep enough now for boats. In SHELF, trawlers fish for the outfit.',
    target: '#fa-tab-shelf',
    show: (g) => season(g) && isShelfOpen(g.outfit),
    done: (g) => count(g.outfit.trawlers) > 0,
  },
  {
    id: 'range',
    title: 'RANGE AND BUOYS',
    text: 'Boats catch more further out, but past the sonar buoys something takes them. Keep the range inside the buoys.',
    target: '[aria-label="RANGE dial"]',
    show: (g) => season(g) && count(g.outfit.trawlers) > 0,
    done: (g) => g.outfit.range !== DEFAULT_RANGE || g.outfit.buoys > 0,
  },
  {
    id: 'station',
    title: 'THE STATION',
    text: 'Out in open water, the station pens specimens that pay for research.',
    target: '#fa-tab-station',
    show: (g) => season(g) && isOpenWaterOpen(g.outfit),
    done: (g) => count(g.outfit.specimens) > 0,
  },
  {
    id: 'enhance',
    title: 'PENS AND ENHANCEMENT',
    text: 'Enhancement makes specimens pay more and harder to hold. Specimens the pens cannot hold get out.',
    target: '[aria-label="ENHANCEMENT dial"]',
    show: (g) => season(g) && count(g.outfit.specimens) > 0,
    done: (g) => g.outfit.enhance !== DEFAULT_ENHANCE || g.outfit.pens > 0,
  },
  {
    id: 'trench',
    title: 'THE TRENCH',
    text: 'Station modules on the trench wall bring up samples.',
    target: '#fa-tab-trench',
    show: (g) => season(g) && isTrenchOpen(g.outfit),
    done: (g) => g.outfit.modules > 0,
  },
  {
    id: 'depth',
    title: 'DEPTH AND THE HULL',
    text: 'Deeper pays more and presses harder on the hull. Repair crews patch it; if it fails, a module floods.',
    target: '[aria-label="STATION DEPTH dial"]',
    show: (g) => season(g) && g.outfit.modules > 0,
    done: (g) => g.outfit.stationDepth !== DEFAULT_STATION_DEPTH || g.outfit.crews > 0,
  },
  {
    id: 'coast',
    title: 'THE COAST',
    text: 'The Breach is open. In COAST, sea walls and Bulwarks hold the cities against each kaiju, a category bigger every time.',
    target: '#fa-tab-coast',
    show: (g) => season(g) && isBreachOpen(g.outfit),
    done: (g) => g.outfit.walls + g.outfit.bulwarks > 0,
  },
  {
    id: 'pilots',
    title: 'PILOTS',
    text: 'A Bulwark needs two linked pilots. Like temperaments link best; a spare pair lets the tired ones rest.',
    target: '[aria-label="Pilot pairs"]',
    show: (g) => season(g) && g.outfit.pilots >= 2,
    done: () => false,
  },
  {
    id: 'flow',
    title: 'THE READOUT',
    text: 'Depth, swimmers and income at the top. The line under them says what is going wrong first.',
    target: '[aria-label="Production flow"]',
    show: (g) => season(g) && g.outfit.elapsed > 60,
    done: () => false,
  },
  {
    id: 'store',
    title: 'THE STORE',
    text: 'STORE sells one-off improvements, including the staff who run the dials for you.',
    target: '#fa-tab-store',
    show: (g) => season(g) && g.outfit.upgrades.length === 0 && g.outfit.lifetimeCash >= 100,
    done: (g) => g.outfit.upgrades.length > 0,
  },
];

export const fathomGuideSteps = (_g: FathomGame): readonly Step[] => STEPS;

const RULES: GuideRules = {
  title: 'HOW THE SEASON WORKS',
  sections: [
    { heading: 'DEPTH', text: 'The outfit works further out as it grows: the beach, then the shelf, open water, the trench and, at last, the coast. Each zone opens a tab.' },
    { heading: 'THE BEACH', text: 'Tourists pay while the beach is open. Guards watch the swimmers; unwatched ones are taken, and every death costs the town\'s trust, which scales tourist money.' },
    { heading: 'THE SHELF', text: 'Trawlers catch more further out. Sonar buoys push safe water out a tenth each; boats fishing past them are lost.' },
    { heading: 'THE STATION', text: 'Penned specimens pay for research. Enhancement pays more, and specimens the pens cannot hold escape into the water.' },
    { heading: 'THE TRENCH', text: 'The deeper the station sits, the more it pays and the harder the water presses. Repair crews hold the hull; at zero, a module floods.' },
    { heading: 'THE COAST', text: 'Kaiju come ashore from the Breach, each a category bigger. Walls and Bulwarks hold the cities; spare force takes fallen ones back. Pilots tire fighting and rest in reserve.' },
    { heading: "THE SEASON'S END", text: 'The season ends when you choose what to do with the seam. The next season starts with standing and field notes.' },
  ],
};

export const fathomGuideRules = (_g: FathomGame): GuideRules => RULES;
