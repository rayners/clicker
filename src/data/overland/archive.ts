import type { ArchiveFile } from '../../mission/kinds';
import type { HaulageMission } from '../../mission/state';

export const OVERLAND_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'land-contract',
    title: 'ROAD HAULAGE CONTRACT KS-R-0102',
    classification: 'STANDARD',
    unlock: (m) => (m as HaulageMission).leg >= 3,
    body: [
      'Rig and crew to carry ore from Pit 4 to Port Kessler Lift, delivering at each depot on the road.',
      'Performance on this contract will be reviewed by the long-haul board.',
      'Note to the board: WARDEN instance shows aptitude. Recommend the Halvorsen Gale.',
    ],
  },
];
