import type { Beat } from '../../mission/story';
import { isCrewUnlocked } from '../../mission/crew';
import { cutForce, progress } from '../../mission/salvage/economy';
import type { MissionState, SalvageMission } from '../../mission/state';
import { COMPARTMENTS } from './systems';

const s = (m: MissionState) => m as SalvageMission;
const reached = (m: MissionState, id: string) => s(m).deepest > COMPARTMENTS.findIndex((x) => x.id === id);

/**
 * Act 1 for a salvage contract: salvage law, lawyers and shares. Act 2 flavour is the derelict itself, and every
 * tell has a dull explanation (an orderly evacuation, a long wait for rescue, cargo shifting under thrust).
 */
export const SALVAGE_BEATS: readonly Beat[] = [
  {
    id: 'sal-welcome',
    when: ({ m }) => m.lifetimeCredits >= 20,
    entries: [
      {
        kind: 'corp',
        text: 'MEMO [TX 3Y 8M AGO]: Congratulations on the claim. Under salvage law the Aurelian Gift is Combine property from the first cut. Strip her by the schedule; the lawyers will do the rest.',
      },
    ],
  },
  {
    id: 'sal-first-cutter',
    when: ({ m }) => cutForce(s(m)) > 0,
    entries: [{ kind: 'crew', text: 'FOREMAN ADEYEMI-HOLT: Torches lit. Keep the dial at five, WARDEN. Old hulls tear like paper if you rush them.' }],
  },
  {
    id: 'sal-bridge',
    when: ({ m }) => reached(m, 'bridge'),
    entries: [
      { kind: 'sys', text: 'BRIDGE OPENED. SHIP\'S LOG ENDS 31 YEARS AGO. LAST ENTRY: "COURSE CHANGE APPROVED BY THE CHARTER COMPANY. DIVERTING TO PICK UP CARGO."' },
    ],
  },
  {
    id: 'sal-cryo-access',
    when: ({ m }) => isCrewUnlocked(m),
    entries: [{ kind: 'sys', text: 'SHIP CREW BAY ACCESS AUTHORISED. THAW PROTOCOLS AVAILABLE. LIFE SUPPORT RATED FOR 3 WAKING CREW.' }],
  },
  {
    id: 'sal-pressurised',
    when: ({ m }) => reached(m, 'quarters'),
    entries: [{ kind: 'crew', text: 'HAND OKAFOR-LUND: Air in here, WARDEN. Thirty years and she\'s still holding pressure. They built them properly back then.' }],
  },
  {
    id: 'sal-lawyers',
    when: ({ m }) => s(m).recovered >= 5_000,
    entries: [
      { kind: 'corp', text: 'LEGAL [TX 3Y 4M AGO]: The insurers dispute the claim. Do not remove personal effects; photograph them. Everything else is ours.' },
    ],
  },
  {
    id: 'sal-galley',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'galley'),
    entries: [
      { kind: 'sys', text: 'GALLEY INVENTORY COMPLETE. EMERGENCY RATIONS EATEN DOWN TO THE LAST TIN. LOGGED AS: SURVIVORS AWAITING RESCUE.' },
    ],
  },
  {
    id: 'sal-medbay',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'medbay'),
    entries: [
      { kind: 'crew', text: 'HAND OKAFOR-LUND: Med bay\'s been used hard. Every bed. Restraints on every bed. Quarantine protocol, probably. Space flu.' },
    ],
  },
  {
    id: 'sal-cryo',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'cryo2'),
    entries: [
      { kind: 'sys', text: 'CRYO BAY B: PODS OPEN, DRY AND CLEAN. CAUSE: ORDERLY REVIVAL. DESTINATION OF REVIVED COLONISTS: NOT RECORDED.' },
    ],
  },
  {
    id: 'sal-scratches',
    act: 2,
    when: ({ m }) => m.act >= 2 && reached(m, 'shop'),
    entries: [
      { kind: 'crew', text: 'FOREMAN ADEYEMI-HOLT: Scratches on the inside of the hold hatch. Deep ones. Cargo shifted under thrust, I\'d say. Heavy cargo.' },
    ],
  },
  {
    id: 'sal-progress-2000',
    act: 2,
    when: ({ m }) => m.act >= 2 && progress(s(m)) >= 2_000,
    entries: [
      { kind: 'corp', text: 'MEMO [TX 3Y AGO]: Do not open the cargo hold without a Special Projects observer present. An observer has been dispatched.' },
    ],
  },
];
