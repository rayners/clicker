import type { SectionState } from '../../shared/ground';

/** Security detachment state: Combine Security taking a silent colony back, sector by sector. */
export interface SecurityFields {
  scenario: 'security';
  troopers: Record<string, number>;
  fabricators: Record<string, number>;
  /** One entry per colony sector (see SECTIONS). */
  ground: SectionState[];
  /** Tenths of the force sent at the frontier; the rest holds secured sectors. Ignored while the tactical net runs it. */
  assaultShare: number;
  sentries: number;
  /** The player has taken the split back from WARDEN's tactical net. */
  netOff: boolean;
  /** Colony property recovered, in credits (retainer and bounties): drives story progress. */
  recovered: number;
  /** Sectors ever secured, counted from the landing pad (the deepest index reached, plus one). */
  deepest: number;
}
