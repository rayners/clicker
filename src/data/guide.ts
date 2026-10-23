import type { GuideRules, GuideStep } from '../engine/guide';
import type { GameState } from '../core/game';
import { isCrewUnlocked } from '../mission/crew';
import { isOutbreak, type MissionState, type OutbreakMission, type ScenarioId } from '../mission/state';

/**
 * DEEP CONTRACT's walkthrough (docs/ROADMAP.md, item 6b): a few steps per contract that introduce its levers in the
 * order they matter, then the levers every contract shares. Each step is done once the player has used the lever.
 */
type Step = GuideStep<GameState>;
type M = MissionState & Record<string, unknown>;

const m = (g: GameState) => g.mission as M;
const count = (o: unknown) => Object.values((o ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0);
const on = (scenario: ScenarioId | ScenarioId[]) => (g: GameState) => g.mode === 'mission' && !g.assigning && ([] as ScenarioId[]).concat(scenario).includes(g.mission.scenario);

const ACTION = '.drill';
const SYSTEMS = '#tab-systems';

const HAUL: Step[] = [
  {
    id: 'haul-push',
    title: 'GET MOVING',
    text: 'Tap the big button to push the train along by hand. Freight pays by the kilometre as it moves, so moving is earning.',
    target: ACTION,
    show: on('haulage'),
    done: (g) => g.mission.lifetimeCredits > 0,
  },
  {
    id: 'haul-engines',
    title: 'ENGINES AND CARS',
    text: 'In SYSTEMS, engines add thrust (speed) and cars add freight (pay per kilometre). Cars are heavy: more of them slows the train unless the engines keep up.',
    target: SYSTEMS,
    show: on('haulage'),
    done: (g) => count(m(g).engines) > 0,
  },
  {
    id: 'haul-burn',
    title: 'THE BURN',
    text: 'The dial sets how hard the engines run. Hotter is faster and makes the delivery windows, but burns fuel by the square and, past the strain line, damages the freight.',
    target: '[aria-label="Helm"]',
    show: (g) => on('haulage')(g) && count(m(g).engines) > 0,
    done: (g) => m(g).burn !== 5,
  },
  {
    id: 'haul-fuel',
    title: 'FUEL AT STATIONS',
    text: 'Fuel is cheap at a station and dear on the road. Refuel for the whole next leg while docked; a dry train only coasts.',
    target: '[aria-label="Helm"]',
    show: (g) => on('haulage')(g) && (m(g).leg as number) > 0,
    done: () => false,
  },
];

/** The overland haul is the same machine on a road, so the same steps in its own words. */
const ROAD: Step[] = [
  {
    id: 'road-push',
    title: 'GET MOVING',
    text: 'Tap the big button to gun the engine by hand. Freight pays by the kilometre as it moves, so moving is earning.',
    target: ACTION,
    show: on('overland'),
    done: (g) => g.mission.lifetimeCredits > 0,
  },
  {
    id: 'road-rig',
    title: 'POWERTRAIN AND TRAILERS',
    text: 'In SYSTEMS, the powertrain adds power (speed) and trailers add freight (pay per kilometre). Trailers are heavy: more of them slows the rig unless the powertrain keeps up.',
    target: SYSTEMS,
    show: on('overland'),
    done: (g) => count(m(g).engines) > 0,
  },
  {
    id: 'road-throttle',
    title: 'THE THROTTLE',
    text: 'The throttle sets how hard the rig runs. Harder is faster and makes the delivery windows, but drinks fuel by the square and, past the strain line, damages the freight.',
    target: '[aria-label="Helm"]',
    show: (g) => on('overland')(g) && count(m(g).engines) > 0,
    done: (g) => m(g).burn !== 5,
  },
  {
    id: 'road-fuel',
    title: 'FUEL AT DEPOTS',
    text: 'Fuel is cheap at a depot and dear on the road. Fill up for the whole next leg while you are stopped; a dry rig only rolls.',
    target: '[aria-label="Helm"]',
    show: (g) => on('overland')(g) && (m(g).leg as number) > 0,
    done: () => false,
  },
];

const EXTRACTION: Step[] = [
  {
    id: 'ext-drill',
    title: 'DRILL',
    text: 'Tap the drill to dig ore by hand. The refinery turns ore into credits automatically.',
    target: ACTION,
    show: on('extraction'),
    done: (g) => (m(g).lifetimeOre as number) > 0,
  },
  {
    id: 'ext-generators',
    title: 'AUTOMATE',
    text: 'In SYSTEMS, buy a survey drone. Every generator digs ore on its own; each tier costs more and digs far more.',
    target: SYSTEMS,
    show: (g) => on('extraction')(g) && g.mission.credits >= 10,
    done: (g) => count(m(g).generators) > 0,
  },
  {
    id: 'ext-refinery',
    title: 'THE REFINERY IS THE LIMIT',
    text: 'Income is the slower of digging and refining. When the readout says the refinery is at capacity, upgrade it: more drills will not help until you do. The buy buttons show what each purchase adds.',
    target: SYSTEMS,
    show: (g) => on('extraction')(g) && count(m(g).generators) >= 10,
    done: (g) => (m(g).refineryLevel as number) > 0,
  },
];

const TERRAFORM: Step[] = [
  {
    id: 'tf-surge',
    title: 'SURGE',
    text: 'Tap to fire a processor surge by hand. Processing makes the planet, and the Combine pays for it.',
    target: ACTION,
    show: on('terraform'),
    done: (g) => (m(g).lifetimeUnits as number) > 0,
  },
  {
    id: 'tf-build',
    title: 'POWER AND PROCESSORS',
    text: 'In SYSTEMS, reactors make power and processors use it. A processor with no power does nothing, so build both.',
    target: SYSTEMS,
    show: on('terraform'),
    done: (g) => count(m(g).reactors) > 0 && count(m(g).processors) > 0,
  },
  {
    id: 'tf-allocation',
    title: 'SPLIT THE POWER',
    text: 'Power goes to three lines: atmosphere, heat and water. The corporate spec says how much each should get; matching it pays best. Move power a tenth at a time.',
    target: '[aria-label="Power allocation"]',
    show: (g) => on('terraform')(g) && count(m(g).processors) > 0,
    done: () => false,
  },
];

const SECURITY: Step[] = [
  {
    id: 'sec-support',
    title: 'FIRE SUPPORT',
    text: 'Tap to call fire support on the frontier sector. Taking a sector pays a bounty, and every sector held pays a retainer.',
    target: ACTION,
    show: on('security'),
    done: (g) => (m(g).deepest as number) > 0,
  },
  {
    id: 'sec-troops',
    title: 'TROOPERS NEED ROUNDS',
    text: 'In SYSTEMS, troopers add force and fabricators make the ammunition they shoot. Short of rounds, an assault loses most of its punch.',
    target: SYSTEMS,
    show: on('security'),
    done: (g) => count(m(g).troopers) > 0 && count(m(g).fabricators) > 0,
  },
  {
    id: 'sec-split',
    title: 'ASSAULT OR HOLD',
    text: 'Every trooper either pushes the frontier or holds what you have taken. Held sectors left short slip back. Move the split a tenth at a time.',
    target: '[aria-label="Force split"]',
    show: (g) => on('security')(g) && (m(g).deepest as number) >= 2,
    done: (g) => m(g).assaultShare !== 8,
  },
];

const SALVAGE: Step[] = [
  {
    id: 'sal-cut',
    title: 'CUT',
    text: 'Tap to cut into the next compartment. Salvage pays as the torch goes in, and every open compartment is stripped for steady income.',
    target: ACTION,
    show: on('salvage'),
    done: (g) => (m(g).deepest as number) > 0,
  },
  {
    id: 'sal-shoring',
    title: 'BRACE WHAT YOU OPEN',
    text: 'In SYSTEMS, cutters cut and shoring holds. Open compartments need shoring equal to their load, or they buckle shut and stop paying.',
    target: SYSTEMS,
    show: on('salvage'),
    done: (g) => count(m(g).cutters) > 0 && count(m(g).shoring) > 0,
  },
  {
    id: 'sal-torch',
    title: 'THE TORCH DIAL',
    text: 'A hotter torch cuts faster but, above the safe line, stresses the hull. Full stress breaches the compartment you are cutting and seals it for a minute.',
    target: '[aria-label="Cutting torch"]',
    show: (g) => on('salvage')(g) && (m(g).deepest as number) > 0,
    done: (g) => m(g).notch !== 5,
  },
];

/** The levers every contract shares, introduced once its own are. */
const SHARED: Step[] = [
  {
    id: 'flow',
    title: 'THE READOUT',
    text: 'The three boxes at the top are the production line. The highlighted one is what is holding you back, and the line under it says what to do about it.',
    target: '[aria-label="Production flow"]',
    show: (g) => g.mode === 'mission' && !g.assigning && g.mission.elapsed > 60,
    done: () => false,
  },
  {
    id: 'upgrades',
    title: 'REQUISITIONS',
    text: 'UPGRADES holds one-off requisitions: multipliers, and automation that does your tapping for you.',
    target: '#tab-upgrades',
    show: (g) => g.mode === 'mission' && g.mission.upgrades.length === 0 && g.mission.lifetimeCredits >= 100,
    done: (g) => g.mission.upgrades.length > 0,
  },
  {
    id: 'crew',
    title: 'THE CREW',
    text: 'CREW lets you wake officers from cryo. Each boosts something while awake, and tires; put them back to sleep before they give out.',
    target: '#tab-crew',
    show: (g) => g.mode === 'mission' && isCrewUnlocked(g.mission),
    done: (g) => Object.values(g.mission.crew).some((c) => c.status !== 'cryo'),
  },
  {
    id: 'directives',
    title: 'DIRECTIVES',
    text: 'The Combine sends timed goals. Meet one before the window closes for a bonus; missing it costs nothing but your record.',
    target: '#tab-directives',
    show: (g) => g.mode === 'mission' && g.mission.directive !== null,
    done: () => false,
  },
];

/** The outbreak's levers, whichever contract it turns up on (docs/OUTBREAK.md). Nothing in act II says what it is. */
const outbreak = (test: (o: OutbreakMission) => boolean) => (g: GameState) => g.mode === 'mission' && !g.assigning && isOutbreak(g.mission) && test(g.mission);
const discovered = (o: OutbreakMission) => o.act >= 3 && o.flags.includes('outbreak');
const OUTBREAK: Step[] = [
  {
    id: 'sick-bay',
    title: 'SICK BAY',
    text: 'Something is going round. SICK BAY shows who is off shift; the Wellness programme gets them back sooner.',
    target: '#tab-sickbay',
    show: outbreak((o) => o.act >= 2),
    done: outbreak((o) => o.wellness > 0),
  },
  {
    id: 'quarantine',
    title: 'QUARANTINE',
    text: 'Staff kept apart do not spread it, and do not work. Turn the dial up while it is going round, down when it is not.',
    target: '[aria-label="Quarantine dial"]',
    show: outbreak(discovered),
    done: outbreak((o) => o.quarantine > 0 || o.officer),
  },
  {
    id: 'wards',
    title: 'WARD BEDS',
    text: 'The sick on a ward bed do not turn. Screening makes every tenth of quarantine count for more.',
    target: '#tab-sickbay',
    show: outbreak((o) => discovered(o) && o.quarantine > 0),
    done: outbreak((o) => o.wards > 0),
  },
  {
    id: 'lockdown',
    title: 'LOCKDOWN',
    text: 'The turned are working against the company. Lockdown seals a section with half of them inside, and costs output while it lasts.',
    target: '#tab-sickbay',
    show: outbreak((o) => o.act >= 4 && o.turned > 0),
    done: outbreak((o) => o.lockdowns > 0),
  },
];

const BY_SCENARIO: Record<ScenarioId, Step[]> = {
  overland: ROAD,
  haulage: HAUL,
  extraction: EXTRACTION,
  terraform: TERRAFORM,
  security: SECURITY,
  salvage: SALVAGE,
};

export function guideSteps(g: GameState): readonly Step[] {
  return [...BY_SCENARIO[g.mission.scenario], ...OUTBREAK, ...SHARED];
}

const RULES: Record<ScenarioId, GuideRules> = {
  overland: {
    title: 'HOW THE OVERLAND HAUL WORKS',
    sections: [
      { heading: 'THE ROAD', text: 'Drive the rig and its trailers from the mine to the space elevator, depot by depot. Freight pays by the kilometre; a delivery inside its window adds a bonus.' },
      { heading: 'ENGINES AND TRAILERS', text: 'Engines add speed, trailers add pay but weigh the rig down. Keep them in balance.' },
      { heading: 'THE THROTTLE', text: 'Hotter is faster but drinks fuel (by the square) and, past the strain line, damages the freight. Fuel is cheap at depots, dear on the road.' },
      { heading: 'THE END', text: 'Reach the lift and the contract ends with a promotion: extraction and the long haul open after it.' },
    ],
  },
  haulage: {
    title: 'HOW HAULAGE WORKS',
    sections: [
      { heading: 'THE LONG HAUL', text: 'Tow a refinery train home station by station. Freight pays by the kilometre; deliveries inside the window earn a bonus.' },
      { heading: 'ENGINES AND CARS', text: 'Engines add thrust, cars add freight value and mass. Better cars carry more value for their weight.' },
      { heading: 'THE BURN', text: 'Hotter is faster but burns fuel by the square and, past the strain line, damages the freight. Refuel at stations; a tender on the road costs three times as much.' },
      { heading: 'AUTOMATION', text: 'The autopilot picks the burn that earns most per second; drone loaders refuel at every dock.' },
    ],
  },
  extraction: {
    title: 'HOW EXTRACTION WORKS',
    sections: [
      { heading: 'ORE TO CREDITS', text: 'Drills and generators dig ore; the refinery turns it into credits. Income is the slower of the two.' },
      { heading: 'THE BOTTLENECK', text: 'The readout highlights whichever stage is limiting. Upgrade the refinery when it is full; buy generators when it is idle.' },
      { heading: 'DEPTH', text: 'Deeper generators dig deeper. What is down there is the Combine\'s business.' },
    ],
  },
  terraform: {
    title: 'HOW TERRAFORMING WORKS',
    sections: [
      { heading: 'POWER AND PROCESSING', text: 'Reactors make power; processors on three lines (atmosphere, heat, water) use it to make the planet. Processing pays.' },
      { heading: 'THE SPEC', text: 'The corporate spec sets the share each line should get. The closer the split matches it, the better the pay. The spec gets revised.' },
      { heading: 'THE COLONISTS', text: 'Colonist waves arrive as the planet improves. Keep them alive.' },
    ],
  },
  security: {
    title: 'HOW COLONY SECURITY WORKS',
    sections: [
      { heading: 'SECTORS', text: 'Take the colony back sector by sector from the landing pad. Each one taken pays a bounty; each one held pays a retainer.' },
      { heading: 'FORCE AND AMMUNITION', text: 'Troopers bring force; fabricators make the rounds the assault burns. Short of rounds, the assault blunts.' },
      { heading: 'ASSAULT OR HOLD', text: 'The split sends part of the force forward and keeps the rest on the line. Held sectors short of a garrison slip back and are lost below half.' },
      { heading: 'SENTRIES', text: 'Sentry guns hold ground on their own, burning ammunition. The tactical net sets the split for you.' },
    ],
  },
  salvage: {
    title: 'HOW SALVAGE WORKS',
    sections: [
      { heading: 'COMPARTMENTS', text: 'Strip the derelict from the bow airlock aft. Cutting into a compartment pays its salvage as the torch goes in; open compartments are stripped for steady income.' },
      { heading: 'CUTTERS AND SHORING', text: 'Cutters cut the next compartment. Shoring braces the ones already open: short of it, they buckle shut.' },
      { heading: 'THE TORCH', text: 'Each notch cuts faster. Above the safe line the hull takes stress; full stress breaches the compartment being cut and seals it for a minute. The hull governor rides the line for you.' },
    ],
  },
};

const OUTBREAK_RULE = {
  heading: 'THE OUTBREAK',
  text: 'Strain KA-11 spreads between staff. The sick stop working; after the discovery they stop getting better, and in time they turn and work against the company. Quarantine slows it at a cost in output; screening sharpens quarantine; ward beds keep the sick from turning. Culture tanks pay Bioproducts and make it spread faster. Lockdown seals the turned away for a while.',
};

export function guideRules(g: GameState): GuideRules {
  const rules = RULES[g.mission.scenario];
  return isOutbreak(g.mission) && discovered(g.mission) ? { ...rules, sections: [...rules.sections, OUTBREAK_RULE] } : rules;
}
