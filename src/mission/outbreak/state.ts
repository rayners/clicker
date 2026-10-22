/** The outbreak horror: Strain KA-11 moving through the contract's workforce, as shares of it (docs/OUTBREAK.md). */
export interface OutbreakFields {
  horror: 'outbreak';
  /** Infected, not yet showing. */
  exposed: number;
  /** Showing, off shift. */
  sick: number;
  /** Turned against the company (act IV onward). */
  turned: number;
  /** Immune: got better while it was still a flu. */
  recovered: number;
  /** Tenths of the workforce kept isolated. */
  quarantine: number;
  /** Named crew who have turned (they show as lost). */
  crewTurned: number;
  /** Bought levels: the Wellness programme (act II), screening and ward beds (after the discovery). */
  wellness: number;
  screening: number;
  wards: number;
  /** Bioproducts: culture tanks, and the samples they grow. */
  cultures: number;
  samples: number;
  /** Sections sealed so far, and seconds left on the current one. */
  lockdowns: number;
  lockdownFor: number;
  /** The Infection Control Officer holds the quarantine dial. */
  officer: boolean;
}
