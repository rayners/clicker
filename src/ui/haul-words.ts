/** How each haul talks on screen: the same controls, in space or on the road. */
export interface HaulWords {
  /** The dial's name, and its two steps (accessible names). */
  dial: string;
  hotter: string;
  gentler: string;
  /** The big manual button. */
  action: string;
  actionAria: string;
  /** Fuel brought out between stops, at the markup. */
  tender: string;
  tenderAria: string;
  /** Where the tug or rig stops. */
  stop: string;
  panelTitle: string;
  engines: string;
  cars: string;
  fit: string;
  couple: string;
  timer: string;
  noEngines: string;
  /** The vessel, the target and the action button's sprite. */
  sprites: { vessel: string; target: string; action: string };
}

export const SPACE_WORDS: HaulWords = {
  dial: 'BURN',
  hotter: 'Burn hotter',
  gentler: 'Burn gentler',
  action: 'FIRE THRUSTERS',
  actionAria: 'Fire thrusters',
  tender: 'CALL A FUEL TENDER (×3 PRICE)',
  tenderAria: 'Call a fuel tender to refuel under way',
  stop: 'STATION',
  panelTitle: 'THE TRAIN',
  engines: 'ENGINES',
  cars: 'CARS',
  fit: 'Fit',
  couple: 'Couple',
  timer: 'PULSE TMR',
  noEngines: 'NO MAIN ENGINES · FIRE THRUSTERS OR FIT ENGINES IN SYSTEMS',
  sprites: { vessel: 'tug', target: 'station', action: 'thruster' },
};

export const LAND_WORDS: HaulWords = {
  dial: 'THROTTLE',
  hotter: 'Throttle up',
  gentler: 'Throttle down',
  action: 'GUN THE ENGINE',
  actionAria: 'Gun the engine',
  tender: 'SEND FOR A FUEL TRUCK (×3 PRICE)',
  tenderAria: 'Send for a fuel truck to refuel on the road',
  stop: 'DEPOT',
  panelTitle: 'THE RIG',
  engines: 'POWERTRAIN',
  cars: 'TRAILERS',
  fit: 'Fit',
  couple: 'Hitch',
  timer: 'GOVERNOR',
  noEngines: 'NO POWERTRAIN · GUN THE ENGINE OR FIT ONE IN SYSTEMS',
  sprites: { vessel: 'crawler', target: 'lift', action: 'piston' },
};
