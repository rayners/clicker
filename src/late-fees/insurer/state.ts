/** Providence Mutual: every survivor of Flight 213 insured, and Death working down the list. */
export interface InsurerFields {
  venue: 'insurer';
  policies: Record<string, number>;
  agents: Record<string, number>;
  /** Tenths of risk appetite: more premium, and a business Death notices faster. Ignored while the mainframe sets it. */
  appetite: number;
  /** Survivors still alive, in the order the design will come for them. */
  list: string[];
  /** 0..1: how complete the design is for the name at the top of the list. */
  omens: number;
  /** Seconds the top name must be held safe before the design skips them. */
  dueIn: number;
  /** Names the design has had to skip: it comes back faster for every one. */
  cheats: number;
  /** Cumulative claims paid. */
  payouts: number;
  /** The claims manager has taken the appetite back from the mainframe. */
  actuaryOff: boolean;
}
