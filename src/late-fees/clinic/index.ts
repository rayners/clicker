import { BEDS, PATIENT_NAMES, STAFF } from '../../late-fees-data/clinic';
import { CLINIC_BEATS, CLINIC_LEXICON } from '../../late-fees-data/clinic-story';
import type { VenueDef } from '../kinds';
import type { ClinicRun, Run, RunConfig } from '../state';
import { clinicSignals, patients, REM_NEED, tickClinic } from './economy';
import type { ClinicFields } from './state';

const c = (r: Run) => r as ClinicRun;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export const CLINIC: VenueDef = {
  id: 'clinic',
  fields: (): ClinicFields => ({
    venue: 'clinic',
    beds: zeroes(BEDS),
    staff: zeroes(STAFF),
    remShare: Math.round(REM_NEED * 10),
    debt: 0,
    suppressant: 0,
    dialOff: false,
    nightmares: 0,
  }),
  boot: (config: RunConfig) => [
    'PLAY ▶',
    config.title,
    'THE SYCAMORE STREET SLEEP CLINIC. A GRANT, AN OLD HOUSE, AND A STREET WHERE NOBODY SLEEPS WELL.',
    'THE BEDS ARE MADE. THE MONITORS ARE WARM. LIGHTS OUT AT TEN.',
  ],
  tick: (r, dt) => tickClinic(c(r), dt),
  signals: (r) => clinicSignals(c(r)),
  lexicon: CLINIC_LEXICON,
  beats: CLINIC_BEATS,
  claim: (r, roll) => (patients(c(r)) > 0 ? { r, victim: `PATIENT ${PATIENT_NAMES[Math.floor(roll() * PATIENT_NAMES.length)]!}` } : null),
  outcome: (r) => ({ output: patients(c(r)), unit: 'BEDS' }),
  stakes: (r) => {
    const clinic = c(r);
    return `THE SYCAMORE STREET CLINIC: ${patients(clinic).toLocaleString('en-US')} PATIENTS STILL ASLEEP. ${clinic.bodyCount.toLocaleString('en-US')} NEVER WOKE UP.`;
  },
};
