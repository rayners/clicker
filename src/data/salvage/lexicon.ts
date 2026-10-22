import type { Lexicon } from '../../shared/lexicon';

/** How a salvage contract names things, for horror text written once for every scenario. */
export const SALVAGE_LEXICON: Lexicon = {
  actTwoEntry: 'CRYO BAYS SURVEYED. PODS: 2,400. OCCUPIED: 0. PODS OPENED IN SEQUENCE FROM THE INSIDE. EVACUATION LOG: NONE FILED.',
  scout: 'SURVEY DRONE "CORMORANT"',
  resonanceScan: 'ACOUSTIC SWEEP OF THE SEALED HOLD',
  voidDepth: 'BEHIND THE CARGO HOLD BULKHEAD',
  sampleRequest: 'Special Projects asks that the Aurelian Gift\'s cargo hold be opened only in the presence of WARDEN, and that its contents be catalogued, not handled.',
  voidBreach: 'THE CARGO HOLD BULKHEAD PARTS. THE HOLD IS FULL TO THE DECKHEAD WITH SOMETHING GROWN, NOT STOWED. THE MANIFEST LISTS AGRICULTURAL SUPPLIES.',
  warmStructure: 'CARGO HOLD AMBIENT 309 K ON A SHIP WITH NO POWER. HUMIDITY 96%. THE FRAMES HAVE BEEN BUILT OVER.',
  cheerfulTweak: 'Cheerier claim-filed chimes.',
  targetCode: 'AG-31',
  surveyDescent: 'Survey drone entered the hold through a vent duct.',
  surveyLoss: 'Drone telemetry ceased 40 m into the hold. Final frame: movement among the cargo.',
  deliverTitle: 'TOW HER HOME',
  deliverText:
    'Weld the cargo hold shut and tow the Aurelian Gift to the Special Projects yard intact, as claimed. The salvage crew ride in her for the eleven years home, to keep the claim. The shares will be paid in full.',
  scuttleTitle: 'BURN HER',
  scuttleText:
    'Cut the drive core loose, bring it critical and pull the tug clear. The Aurelian Gift and everything in her hold burn for a week. The claim is void, and Special Projects receives nothing.',
  broadcastTail: 'Then tow her home anyway.',
};
