import type { ArchiveFile } from '../../mission/kinds';
import { progress } from '../../mission/security/economy';
import type { SecurityMission } from '../../mission/state';

export const SECURITY_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'detachment-orders',
    title: 'DETACHMENT ORDERS CSD-1201',
    classification: 'STANDARD',
    unlock: (m) => progress(m as SecurityMission) >= 500,
    body: [
      'Combine Security Division detachment to proceed to LV-1201 and restore company control of all colony property.',
      'Rules of engagement: proportionate response to looters and wildlife. Colony fixtures are not to be damaged where avoidable.',
      'Annex C (sealed until the sub-levels are reached): the detachment will place itself at the disposal of the Special Projects observer.',
    ],
  },
  {
    id: 'colony-survey',
    title: 'COLONY SITE SURVEY, CALDER\'S LANDING',
    classification: 'STANDARD',
    unlock: (m) => (m as SecurityMission).deepest >= 9,
    body: [
      'Atmosphere processor sited over a natural cavity system, to make use of geothermal heat.',
      'Cavity system surveyed to 400 m. Survey beyond 400 m: deferred at the request of Special Projects.',
      'Colonists were not informed of the deferral.',
    ],
  },
];
