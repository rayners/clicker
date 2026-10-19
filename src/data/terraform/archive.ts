import type { ArchiveFile } from '../../mission/kinds';
import { progress } from '../../mission/terraform/economy';
import type { TerraformMission } from '../../mission/state';

export const TERRAFORM_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'berth-contract',
    title: 'COLONY BERTH CONTRACT KA-M-0001',
    classification: 'STANDARD',
    unlock: (m) => progress(m as TerraformMission) >= 500,
    body: [
      'The Purchaser is entitled to one cryogenic berth and transit to Merrow, and to residence in a habitable environment on arrival.',
      '"Habitable" shall be as defined in the current Kessler-Amari habitability specification, as revised from time to time.',
      'Clause 9(b): The Purchaser consents to participate in such biological programmes as Special Projects may designate.',
    ],
  },
];
