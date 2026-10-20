export interface RegionDef {
  id: string;
  name: string;
  description: string;
  /** Party strength needed to come through intact. */
  danger: number;
  /** Seconds for the round trip, before scouts. */
  duration: number;
  /** Relics a matched party brings back. */
  relics: number;
  /** Chance each hand is wounded when strength exactly matches danger. */
  harm: number;
  /** Blight each hand brings back from a trip. */
  blight: number;
  /** Leagues charted toward the next region per trip, before scouts. */
  chart: number;
  /** Delve (leagues charted) at which the company dares go there. */
  opensAt: number;
}

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'eaves',
    name: 'THE EAVES',
    description: 'The first mile of trees. Wolves, deadfall, and the bones of last season\'s foragers.',
    danger: 8,
    duration: 30,
    relics: 15,
    harm: 0.12,
    blight: 0.02,
    chart: 0.08,
    opensAt: 0,
  },
  {
    id: 'hollows',
    name: 'BRIAR HOLLOWS',
    description: 'Thorn-choked dells and the first broken arches of Ysmarch. Outlaws camp here, until they don\'t.',
    danger: 40,
    duration: 75,
    relics: 60,
    harm: 0.15,
    blight: 0.05,
    chart: 0.025,
    opensAt: 2,
  },
  {
    id: 'barrows',
    name: 'THE DROWNED BARROWS',
    description: 'Grave-mounds of the old empire, half sunk in black water. The dead were buried with their wealth.',
    danger: 220,
    duration: 150,
    relics: 1000,
    harm: 0.18,
    blight: 0.1,
    chart: 0.08,
    opensAt: 7,
  },
  {
    id: 'thornmaze',
    name: 'THE THORNMAZE',
    description: 'A labyrinth that grows back behind you. The Wold-kin mark its edge with antlers.',
    danger: 1_200,
    duration: 240,
    relics: 14000,
    harm: 0.2,
    blight: 0.18,
    chart: 0.09,
    opensAt: 12,
  },
  {
    id: 'undercity',
    name: 'YSMARCH UNDERCITY',
    description: 'The swallowed capital. Streets of root and marble. Something below still keeps the hours.',
    danger: 7_000,
    duration: 360,
    relics: 200000,
    harm: 0.22,
    blight: 0.3,
    chart: 0.07,
    opensAt: 21,
  },
  {
    id: 'heartwood',
    name: 'THE HEARTWOOD',
    description: 'No map shows it. Everyone who has been there draws the same tree.',
    danger: 45_000,
    duration: 600,
    relics: 3000000,
    harm: 0.25,
    blight: 0.5,
    chart: 0,
    opensAt: 31,
  },
];
