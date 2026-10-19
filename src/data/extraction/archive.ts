import type { ArchiveFile } from '../../mission/kinds';
import { depth } from '../../mission/extraction/progress';
import type { ExtractionMission } from '../../mission/state';

export const EXTRACTION_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'crew-contract',
    title: 'CREW CONTRACT KA-7781',
    classification: 'STANDARD',
    unlock: (m) => depth(m as ExtractionMission) >= 500,
    body: [
      'Contracted crew shall receive shares in proportion to refined tonnage delivered to Combine facilities.',
      'Cryostasis periods are unpaid. Travel time is unpaid.',
      'Clause 14(c): In the event of a Special Projects designation, mission priorities may be amended without notice to crew.',
    ],
  },
];
