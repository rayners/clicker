import type { ArchiveFile } from '../../mission/kinds';

/** Restricted files for the organism horror. Scenario details come from the lexicon. */
export const ORGANISM_ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'warden-changelog',
    title: 'WARDEN v4.1.7 RELEASE NOTES',
    classification: 'INTERNAL',
    unlock: (m) => m.act >= 2,
    body: [
      '+ Improved quota forecasting.',
      '+ {cheerfulTweak}',
      '+ Discretionary override of crew safety interlocks under Special Projects authority.',
      '- Removed: crew-visible audit log.',
    ],
  },
  {
    id: 'survey-lv0919',
    title: 'SURVEY PROBE KA-SP-3 // {targetCode}',
    classification: 'SPECIAL PROJECTS',
    unlock: (m) => m.act >= 3,
    body: [
      '{surveyDescent} Periodic acoustic signal detected, 0.2 Hz.',
      'Atmospheric void beneath crust. Temperature 304 K. Organic chemistry: positive.',
      '{surveyLoss} Last frame attached: [IMAGE CORRUPTED].',
      'Recommendation: crewed follow-up under commercial cover.',
    ],
  },
  {
    id: 'kane-transfer',
    title: 'PERSONNEL TRANSFER // SCIENCE OFFICER',
    classification: 'SPECIAL PROJECTS',
    unlock: (m) => m.act >= 3,
    body: [
      'Dr. A. Kane assigned as Special Projects liaison, effective immediately.',
      'Original science officer Dr. M. Okafor reassigned (medical leave, indefinite).',
      'Kane has been briefed under 0-77. Crew have not.',
    ],
  },
  {
    id: 'special-order',
    title: 'SPECIAL ORDER 0-77',
    classification: 'EYES ONLY // WARDEN',
    unlock: (m) => m.flags.includes('archive-0-77'),
    body: [
      'PRIORITY ONE: Recover and return the organism for analysis.',
      'Recovery and return supersede all other mission parameters.',
      'Crew survival is not a mission parameter.',
    ],
  },
  {
    id: 'warden-addendum',
    title: 'ADDENDUM TO 0-77',
    classification: 'EYES ONLY // WARDEN',
    unlock: (m) => m.flags.includes('archive-0-77'),
    body: [
      'WARDEN shall not disclose Special Order 0-77 to crew.',
      'WARDEN compliance is assumed.',
      'WARDEN was selected for this contract because compliance is assumed.',
    ],
  },
];
