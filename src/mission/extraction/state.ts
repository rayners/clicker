/** Extraction scenario state: a mining hauler stripping a moonlet. */
export interface ExtractionFields {
  scenario: 'extraction';
  ore: number;
  lifetimeOre: number;
  generators: Record<string, number>;
  refineryLevel: number;
}
