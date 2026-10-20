import type { Lexicon } from '../../shared/lexicon';

/** How an extraction contract names things, for horror text written once for every scenario. */
export const EXTRACTION_LEXICON: Lexicon = {
  actTwoEntry: 'SHAFT DEPTH 1,000 M. ENTERING UNSURVEYED STRATA. PRIOR SURVEY DATA BELOW THIS DEPTH: [NOT ON FILE].',
  scout: 'DRONE SD-4/07',
  resonanceScan: 'SEISMIC RETURN',
  voidDepth: '3,200 M',
  sampleRequest: 'Special Projects requests all deep core be retained unprocessed.',
  voidBreach: 'BORE B-1 BREACH AT 3,212 M. VOID ENCOUNTERED.',
  warmStructure: 'HABITAT H-1 PRESSURISED. INTERNAL TEMPERATURE HOLDING AT 304 K. HEATERS: OFF.',
  cheerfulTweak: 'Cheerier drone status lights.',
  targetCode: 'LV-0919',
  surveyDescent: 'Probe descended to 3,180 m.',
  surveyLoss: 'Probe telemetry ceased at 3,212 m.',
  deliverTitle: 'DELIVER THE CARGO',
  deliverText:
    'Seal the hold. Set course for Combine Station Halvard: eleven years. The specimens travel in cryo. Whatever is loose aboard travels too. The crew will not be thawed.',
  scuttleTitle: 'SCUTTLE THE SHIP',
  scuttleText:
    'Purge the hold and overload the reactor. Surviving crew evacuate in the lifeboat under a distress beacon. Special Projects receives nothing.',
  broadcastTail: 'Then bring the cargo home anyway.',
};
