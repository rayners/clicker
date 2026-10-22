import type { ArchiveFile } from '../../mission/kinds';
import { progress } from '../../mission/salvage/economy';
import type { SalvageMission } from '../../mission/state';
import { COMPARTMENTS } from './systems';

const HOLD = COMPARTMENTS.findIndex((c) => c.deep);

export const SALVAGE_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'salvage-claim',
    title: 'SALVAGE CLAIM KA-S-3107',
    classification: 'STANDARD',
    unlock: (m) => progress(m as SalvageMission) >= 500,
    body: [
      'Combine Salvage Division claims the colony transport Aurelian Gift, found derelict, in full.',
      'Crew shares are paid on stripped value. Personal effects of the colonists are to be photographed and returned to their estates.',
      'Annex D (sealed until the cargo hold is reached): the claim includes the hold\'s contents, which are to be surrendered to Special Projects.',
    ],
  },
  {
    id: 'aurelian-charter',
    title: 'CHARTER AMENDMENT, AURELIAN GIFT',
    classification: 'STANDARD',
    unlock: (m) => (m as SalvageMission).deepest >= HOLD,
    body: [
      'Charterer: Kessler-Amari Combine. Thirty-one years ago the charter was amended mid-voyage to add one stop: a survey beacon on LV-0919.',
      'Cargo loaded at the beacon: one consignment, listed as agricultural supplies, stowed in the main hold.',
      'The colonists were not informed of the amendment.',
    ],
  },
];
