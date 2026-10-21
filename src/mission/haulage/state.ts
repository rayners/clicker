/** Haulage state: the tug Halvorsen Gale towing a refinery train home, station by station. */
export interface HaulageFields {
  scenario: 'haulage';
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
  /** Delivery revenue banked: drives story progress. */
  delivered: number;
  /** Deliveries made inside their window. */
  onTime: number;
}
