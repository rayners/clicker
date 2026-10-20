import type { KillerDef, VenueDef } from './kinds';
import type { Run, VenueId } from './state';
import { CAMP } from './camp';
import { KILLERS } from './killers';

export { KILLERS };

export const VENUES: Readonly<Record<VenueId, VenueDef>> = { camp: CAMP };

export const venueOf = (r: Run): VenueDef => VENUES[r.venue];
export const killerOf = (r: Run): KillerDef => KILLERS[r.killer];
