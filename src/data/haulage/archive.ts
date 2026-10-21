import type { ArchiveFile } from '../../mission/kinds';
import { progress } from '../../mission/haulage/economy';
import type { HaulageMission } from '../../mission/state';
import { BEACON_LEG } from './systems';

export const HAULAGE_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'haul-contract',
    title: 'HAULAGE CONTRACT KA-H-5520',
    classification: 'STANDARD',
    unlock: (m) => progress(m as HaulageMission) >= 500,
    body: [
      'Tug and crew to bring the refinery train home along the contracted route, delivering at each station.',
      'Clause 14: the tug will answer any distress beacon on the route. Costs of the detour are borne by the crew\'s shares.',
      'Schedule C (sealed): one container, reference KA-77, to be carried without inspection and handed to a Special Projects receiving team.',
    ],
  },
  {
    id: 'haul-beacon',
    title: 'BEACON REGISTRY QUERY',
    classification: 'RESTRICTED',
    unlock: (m) => (m as HaulageMission).leg > BEACON_LEG,
    body: [
      'Beacon transponder registered to the commercial tug Halvorsen Gale.',
      'The Halvorsen Gale is this vessel.',
      'Registry note: duplicate entry, likely clerical. Do not correct.',
    ],
  },
];
