/** Grayhaven State Hospital: a county asylum on the hill above Millbrook, paid per bed filled. */
export interface AsylumFields {
  venue: 'asylum';
  wards: Record<string, number>;
  staff: Record<string, number>;
  /** Tenths of the dose the wards get. Ignored while the pharmacy protocol sets it. */
  sedation: number;
  /** 0..1: how close the wards are to boiling over. At 1, there is an incident. */
  agitation: number;
  /** 0..1: the state inspector's rating. Heavy sedation drags it down, and funding with it. */
  rating: number;
  /** Security doors standing. Each holds an incident (or several, with better locks) before it has to be replaced. */
  doors: number;
  /** Wear on the door taking the next incident, 0..1. */
  doorWear: number;
  /** Patients out on the streets of Millbrook. */
  loose: number;
  /** Fractional progress toward finding the next escapee. */
  searching: number;
  /** Patients ever escaped. */
  escapes: number;
  /** The superintendent has taken the dial back from the pharmacy. */
  dialOff: boolean;
}
