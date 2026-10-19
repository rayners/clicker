export interface GeneratorDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  /** Ore per second per unit. */
  baseRate: number;
}

export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: 'drone',
    name: 'SURVEY DRONE',
    description: 'Kessler-Amari SD-4 "Prospector". Skims surface regolith. Cheerful status lights.',
    baseCost: 15,
    baseRate: 0.5,
  },
  {
    id: 'auger',
    name: 'AUGER RIG',
    description: 'Tripod-mounted rotary auger. Bolts straight into the crust.',
    baseCost: 120,
    baseRate: 3.5,
  },
  {
    id: 'crawler',
    name: 'CRAWLER EXCAVATOR',
    description: 'Tracked strip-miner. Leaves long, straight scars across the plain.',
    baseCost: 1_100,
    baseRate: 28,
  },
  {
    id: 'massdriver',
    name: 'MASS DRIVER',
    description: 'Magnetic rail. Flings ore canisters up to the Reach in low gravity.',
    baseCost: 12_000,
    baseRate: 200,
  },
  {
    id: 'seismic',
    name: 'SEISMIC CHARGE ARRAY',
    description: 'Shaped charges fracture the deep strata. Readings come back... textured.',
    baseCost: 130_000,
    baseRate: 1_450,
  },
  {
    id: 'bore',
    name: 'DEEP-CORE BORE',
    description: 'Sinks a shaft kilometres down. Corporate has asked for core samples.',
    baseCost: 1_400_000,
    baseRate: 10_500,
  },
  {
    id: 'habitat',
    name: 'SUBSURFACE HABITAT',
    description: 'Pressurised work module at depth. The walls stay warm without heating.',
    baseCost: 20_000_000,
    baseRate: 80_000,
  },
  {
    id: 'abyssal',
    name: 'ABYSSAL SHAFT',
    description: 'Do not record what the shaft reaches. Per directive.',
    baseCost: 330_000_000,
    baseRate: 620_000,
  },
];
