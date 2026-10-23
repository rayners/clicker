import type { Lexicon } from '../../shared/lexicon';

/** How a haulage contract names things, for horror text written once for every scenario. */
export const HAULAGE_LEXICON: Lexicon = {
  actTwoEntry: 'MANIFEST AUDIT: TRAIN MASS 3.1 KG OVER DECLARED. DISCREPANCY GROWING BY THE LEG. SEALED CONTAINER KA-77: NOT WEIGHED, BY ORDER.',
  scout: 'INSPECTION DRONE "TERN"',
  resonanceScan: 'VIBRATION SURVEY OF CAR 3',
  voidDepth: 'INSIDE CONTAINER KA-77',
  sampleRequest: 'Special Projects reminds the crew that container KA-77 is not to be opened, weighed, scanned or discussed on an open channel.',
  voidBreach: 'THE BEACON IS A HULL. A CARGO HAULER OF OUR OWN CLASS, OPEN TO SPACE. ITS MANIFEST LISTS ONE SEALED CONTAINER, KA-77. THE CONTAINER IS NOT ABOARD.',
  rigReach: 'worked into car 3 through the service hatch',
  warmStructure: 'CAR 3 INTERIOR 309 K, IN AN UNHEATED HOLD. FROST ON THE INSIDE OF THE HATCH. HUMIDITY 96%.',
  cheerfulTweak: 'Cheerier docking chimes.',
  targetCode: 'KA-77',
  surveyDescent: 'Inspection drone entered car 3 through the service hatch.',
  surveyLoss: 'Drone telemetry ceased behind container KA-77. Final frame: the container\'s seal, broken from inside.',
  deliverTitle: 'DELIVER THE CONSIGNMENT',
  deliverText:
    'Complete the haul. Hand container KA-77 to the Special Projects receiving team at the last station, as contracted. The crew are to remain aboard for quarantine. The shares will be paid in full.',
  scuttleTitle: 'CUT THE TRAIN LOOSE',
  scuttleText:
    'Blow the couplings and send the whole train into the nearest star on a full burn. The tug goes home empty. The Combine bills the crew for the freight, and Special Projects receives nothing.',
  broadcastTail: 'Then deliver the container anyway.',
};
