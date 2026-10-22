/** The Board's divisions (docs/BOARDROOM.md): levels bought with value. */
export type DivisionId = 'specialProjects' | 'bioproducts' | 'personnel' | 'legal' | 'logistics' | 'coo';

export interface Division {
  id: DivisionId;
  name: string;
  description: string;
  cost: number;
  growth: number;
  max: number;
}

export const DIVISIONS: readonly Division[] = [
  { id: 'personnel', name: 'PERSONNEL', description: 'Crews sourced in bulk, from a supplier that never seems to run out. Charters cost less.', cost: 3e6, growth: 2.5, max: 5 },
  { id: 'legal', name: 'LEGAL', description: 'Counsel on retainer. Every loss is somebody else\'s liability. Scrutiny rises more slowly.', cost: 4e6, growth: 2.5, max: 5 },
  { id: 'specialProjects', name: 'SPECIAL PROJECTS', description: 'A floor nobody visits. Pays more for every specimen a contract brings home.', cost: 6e6, growth: 3, max: 5 },
  { id: 'bioproducts', name: 'BIOPRODUCTS', description: 'A floor with its own air supply. Pays more for every sample a contract brings home.', cost: 6e6, growth: 3, max: 5 },
  { id: 'logistics', name: 'LOGISTICS', description: 'Tighter schedules, fewer stops. Every contract runs faster.', cost: 1e7, growth: 3, max: 4 },
  { id: 'coo', name: 'CHIEF OPERATING OFFICER', description: 'Recharters every free office with the best-paying contract on the ledger.', cost: 2.5e7, growth: 1, max: 1 },
];
