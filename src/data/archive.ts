import type { MissionState } from '../mission/state';
import { depth } from '../mission/progress';

export interface ArchiveFile {
  id: string;
  title: string;
  classification: string;
  body: string[];
  unlock(m: MissionState): boolean;
}

export const ARCHIVE: readonly ArchiveFile[] = [
  {
    id: 'crew-contract',
    title: 'CREW CONTRACT KA-7781',
    classification: 'STANDARD',
    unlock: (m) => depth(m) >= 500,
    body: [
      'Contracted crew shall receive shares in proportion to refined tonnage delivered to Combine facilities.',
      'Cryostasis periods are unpaid. Travel time is unpaid.',
      'Clause 14(c): In the event of a Special Projects designation, mission priorities may be amended without notice to crew.',
    ],
  },
  {
    id: 'warden-changelog',
    title: 'WARDEN v4.1.7 RELEASE NOTES',
    classification: 'INTERNAL',
    unlock: (m) => m.act >= 2,
    body: [
      '+ Improved quota forecasting.',
      '+ Cheerier drone status lights.',
      '+ Discretionary override of crew safety interlocks under Special Projects authority.',
      '- Removed: crew-visible audit log.',
    ],
  },
  {
    id: 'survey-lv0919',
    title: 'SURVEY PROBE KA-SP-3 // LV-0919',
    classification: 'SPECIAL PROJECTS',
    unlock: (m) => m.act >= 3,
    body: [
      'Probe descended to 3,180 m. Periodic acoustic signal detected, 0.2 Hz.',
      'Atmospheric void beneath crust. Temperature 304 K. Organic chemistry: positive.',
      'Probe telemetry ceased at 3,212 m. Last frame attached: [IMAGE CORRUPTED].',
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
