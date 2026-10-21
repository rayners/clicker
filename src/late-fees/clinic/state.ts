/** The Sycamore Street Sleep Clinic: a sleep study that pays by the dreaming hour. */
export interface ClinicFields {
  venue: 'clinic';
  beds: Record<string, number>;
  staff: Record<string, number>;
  /** Tenths of the patients allowed into deep sleep. Ignored while automated monitoring sets it. */
  remShare: number;
  /** Sleep debt, 0..2: builds while deep sleep is denied. Past 1, patients nod off where nobody is watching. */
  debt: number;
  /** Suppressant allocations from the grant-holder. */
  suppressant: number;
  /** The administrator has taken the dial back from automated monitoring. */
  dialOff: boolean;
  /** Fractional deaths carried between ticks. */
  nightmares: number;
}
