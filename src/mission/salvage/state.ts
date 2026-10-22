import type { SectionState } from '../../shared/ground';

/** Salvage state: the tug Corvid Tithe stripping a derelict colony transport compartment by compartment. */
export interface SalvageFields {
  scenario: 'salvage';
  cutters: Record<string, number>;
  shoring: Record<string, number>;
  /** One entry per compartment (see COMPARTMENTS), from the bow airlock aft. */
  ground: SectionState[];
  /** The torch dial, 1-10. Ignored while the hull governor runs it. */
  notch: number;
  /** Hull stress, 0..1. Full stress breaches the frontier compartment. */
  stress: number;
  /** Seconds before the breached frontier can be cut again. */
  sealedFor: number;
  /** The player has taken the torch back from WARDEN's hull governor. */
  governorOff: boolean;
  /** Salvage recovered, in credits: drives story progress. */
  recovered: number;
  /** Compartments ever opened, counted from the bow (the deepest index reached, plus one). */
  deepest: number;
  /** How far into the frontier compartment its salvage has already been paid, so a re-cut pays nothing. */
  paidTo: number;
  breaches: number;
}
