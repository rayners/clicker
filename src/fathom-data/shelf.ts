export interface TrawlerDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Catch money per second at the nearest grounds. */
  rate: number;
}

/** Boats working the continental shelf. They pay more the further out they fish. */
export const TRAWLERS: readonly TrawlerDef[] = [
  { id: 'skiff', name: 'LONGLINE SKIFF', short: 'SKIFFS', description: 'Two men, a line with a thousand hooks, and a radio that works when it feels like it.', baseCost: 2_000, rate: 12 },
  { id: 'trawler', name: 'STERN TRAWLER', short: 'TRAWLERS', description: 'A net the size of a football field. Lately it comes up torn, as if something pulled it from the inside.', baseCost: 25_000, rate: 110 },
  { id: 'factory', name: 'FACTORY SHIP', short: 'FACTORY', description: 'Catches, guts and freezes at sea. The crew have stopped eating what comes up from the deep sets.', baseCost: 300_000, rate: 900 },
];

/** Shelf depth (on the story scale, metres) at which the trawlers' grounds open. */
export const SHELF_OPENS_AT = 100;

/** How far out each sonar buoy lets the boats work safely, in tenths of the dial. */
export const BUOY_REACH = 1;
export const BUOY_BASE_COST = 1_500;
export const BUOY_COST_GROWTH = 1.6;

/** What takes gear off the shelf. */
export const SHELF_TAKERS = ['A GIANT SQUID', 'AN OCTOPUS THE SIZE OF A CAR', 'SOMETHING THAT WRAPPED THE WHOLE NET', 'TENTACLES, SAYS THE SKIPPER, AS THICK AS HIS LEG'];
