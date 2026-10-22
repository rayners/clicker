import type { ArchiveFile } from '../../mission/kinds';

/** Restricted files for the outbreak horror. Scenario details come from the lexicon. */
export const OUTBREAK_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'ob-wellness',
    title: 'WELLNESS PROGRAMME: CONTRACT STAFF',
    classification: 'INTERNAL',
    unlock: (m) => m.act >= 2,
    body: [
      'Sick days are logged against the contract, not the employee.',
      'Staff with respiratory symptoms are to be swabbed, and the swabs kept cold.',
      'Swabs are forwarded with the quarterly returns. Medical is not to run its own tests.',
    ],
  },
  {
    id: 'ob-ka11',
    title: 'BIOPRODUCTS: STRAIN KA-11 // {targetCode}',
    classification: 'SPECIAL PROJECTS',
    unlock: (m) => m.act >= 3,
    body: [
      'Survey swabs from {targetCode} returned a viable organism. Incubation in mammalian tissue: positive.',
      'Presents as a mild respiratory infection. Hosts recover until the source is disturbed.',
      'Recommendation: a crewed follow-up under commercial cover. The workforce will serve as culture medium.',
    ],
  },
  {
    id: 'ob-directive-11',
    title: 'BIOPRODUCTS DIRECTIVE 11',
    classification: 'EYES ONLY',
    unlock: (m) => m.flags.includes('archive-directive-11'),
    body: [
      'Treatment of infected staff is prohibited.',
      'Samples take priority over crew. Turned staff are to be retained for study.',
      'WARDEN is to maintain productivity reporting throughout. Wellness points are to be paid as normal.',
    ],
  },
];
