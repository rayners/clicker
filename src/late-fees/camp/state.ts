import type { SectionState } from '../../shared/ground';

/** Camp Blackwater: zones opened at the frontier, kept only while watched and lit. */
export interface CampFields {
  venue: 'camp';
  counselors: Record<string, number>;
  lights: Record<string, number>;
  /** One entry per zone (see ZONES). */
  zones: SectionState[];
  /** Tenths of the staff on prep work at the frontier; the rest keep watch. Ignored while the head counselor runs it. */
  prepShare: number;
  towers: number;
  /** The director has taken the roster back from the head counselor. */
  headOff: boolean;
  /** Zones ever opened, counted from the front gate. */
  deepest: number;
}
