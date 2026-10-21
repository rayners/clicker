export interface SpecimenDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Research money per second, before the lab enhances it. */
  rate: number;
}

/** What the research station brings in from open water: each is caught, penned and studied. */
export const SPECIMENS: readonly SpecimenDef[] = [
  { id: 'reef', name: 'REEF SHARK', short: 'REEF', description: 'Small, quick, curious. The interns name them. That stops after the first week.', baseCost: 40_000, rate: 120 },
  { id: 'white', name: 'GREAT WHITE', short: 'WHITES', description: 'Four metres of muscle in a pen built for three. It watches the people on the walkway.', baseCost: 450_000, rate: 1_000 },
  { id: 'mako', name: 'ENHANCED MAKO', short: 'MAKOS', description: 'The parent company\'s protein work, in a shark. Its brain is twice the size it should be. It has started testing the gate.', baseCost: 5_000_000, rate: 8_000 },
];

/** Depth (story scale) at which the research station can be built out in open water. */
export const OPEN_WATER_AT = 500;

/** Specimens each pen holds, unenhanced. */
export const PEN_HOLDS = 2;
export const PEN_BASE_COST = 30_000;
export const PEN_COST_GROWTH = 1.5;

/** What the beach report says when one gets out. */
export const ESCAPE_LINES = ['THE GATE ON PEN 3 WAS FOUND OPEN FROM THE INSIDE.', 'A PEN WALL CRACKED OVERNIGHT. THE BREAK IS SHAPED LIKE A JAW.', 'THE NIGHT TECH SAYS IT JUMPED THE BARRIER. THE BARRIER IS SIX METRES HIGH.'];
