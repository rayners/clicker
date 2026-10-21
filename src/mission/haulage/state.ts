/** The hauls that share these rules: the long haul in space, and the overland road to the lift. */
export type HaulId = 'haulage' | 'overland';

/** Haulage state: a tug (or a crawler rig) towing freight along a chain of stations (or depots). */
export interface HaulageFields<S extends HaulId = HaulId> {
  scenario: S;
  engines: Record<string, number>;
  cars: Record<string, number>;
  /** Legs completed; the tug is on its way to stationName(leg). */
  leg: number;
  /** Distance covered on the current leg. */
  travelled: number;
  /** Seconds since leaving the last station: the delivery window runs from departure. */
  legTime: number;
  /** Seconds left at the dock; zero while under way. */
  docked: number;
  /** Throttle notch, 1-10, as the player set it. WARDEN's autopilot overrides it while it runs. */
  burn: number;
  /** The player has taken the burn back from WARDEN's autopilot. */
  autopilotOff: boolean;
  fuel: number;
  /** Condition of the freight aboard, 0-1. Burning past the strain line damages it; fresh freight loads at every station. */
  condition: number;
  /** Credits the freight has earned so far this leg: the window bonus at delivery is a share of it. */
  accrued: number;
  /** Delivery revenue banked: drives story progress. */
  delivered: number;
  /** Deliveries made inside their window. */
  onTime: number;
}
