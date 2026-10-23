import type { Lexicon } from '../../engine/lexicon';

/** How a terraforming contract names things, for horror text written once for every scenario. */
export const TERRAFORM_LEXICON: Lexicon = {
  actTwoEntry: 'SURFACE PRESSURE PASSES 1 KPA. MELTWATER REACHING UNSURVEYED BASINS. PRIOR SURVEY DATA FOR SUBSURFACE: [NOT ON FILE].',
  scout: 'SURVEY ROVER R-7',
  resonanceScan: 'ATMOSPHERIC SOUNDING',
  voidDepth: '3 KM BENEATH THE AQUIFER',
  sampleRequest: 'Special Projects requests all deep aquifer water be retained untreated.',
  voidBreach: 'AQUIFER TAP A-1 BREAKS INTO A CHAMBER BENEATH THE RESERVOIR. VOID ENCOUNTERED.',
  rigReach: 'lowered down aquifer tap A-1 into the chamber',
  warmStructure: 'COLONY DISTRICT 1 PRESSURISED. INTERNAL TEMPERATURE HOLDING AT 304 K. HEATERS: OFF.',
  cheerfulTweak: 'Cheerier station chimes.',
  targetCode: 'KA-T-88',
  surveyDescent: 'Probe descended through the polar cap to 3,180 m.',
  surveyLoss: 'Probe telemetry ceased in a liquid layer at 3,212 m.',
  deliverTitle: 'CERTIFY THE COLONY',
  deliverText:
    'Sign Merrow off as habitable to the final envelope. Special Projects takes possession of the planet. The colonists are already in place. They will not be told what for.',
  scuttleTitle: 'STERILISE MERROW',
  scuttleText:
    'Run every heater past failure and vent the new atmosphere to space. Nothing on the surface survives the winter. Surviving crew leave on the last shuttle. Special Projects receives nothing.',
  broadcastTail: 'Then certify the colony anyway.',
};
