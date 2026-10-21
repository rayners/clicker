export interface AttractionDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Tourist money per second while the beach is open. */
  rate: number;
}

/** What brings the tourists, and the money, down to Harrow Point's beaches. The ladder matches the other games' proven tiers. */
export const ATTRACTIONS: readonly AttractionDef[] = [
  { id: 'umbrellas', name: 'BEACH UMBRELLAS', short: 'UMBRELLAS', description: 'Striped canvas, a dollar an hour. The wind takes one a week.', baseCost: 15, rate: 0.1 },
  { id: 'shack', name: 'SNACK SHACK', short: 'SHACK', description: 'Hot dogs, shaved ice, and a jukebox that only plays songs about summer.', baseCost: 120, rate: 0.7 },
  { id: 'surf', name: 'SURF SCHOOL', short: 'SURF', description: 'Boards for hire and an instructor who has seen a fin twice and tells nobody.', baseCost: 1_100, rate: 5 },
  { id: 'tours', name: 'GLASS-BOTTOM TOURS', short: 'TOURS', description: 'Out past the sandbar to look at the reef. The tourists love it. The reef is quieter than it used to be.', baseCost: 12_000, rate: 40 },
  { id: 'pier', name: 'THE PIER', short: 'PIER', description: 'An arcade, a carousel and a fishing deck at the end. Something took a whole rod off it last week.', baseCost: 130_000, rate: 260 },
];

export interface GuardDef {
  id: string;
  name: string;
  short: string;
  description: string;
  baseCost: number;
  /** Swimmers each keeps safe. */
  covers: number;
}

/** Keeping the swimmers safe: the brake. Dearer faster than attractions. */
export const GUARDS: readonly GuardDef[] = [
  { id: 'lifeguard', name: 'LIFEGUARD', short: 'GUARDS', description: 'A whistle, a tower and a tan. Can spot a riptide at four hundred yards.', baseCost: 30, covers: 2 },
  { id: 'net', name: 'SHARK NET', short: 'NETS', description: 'A mesh curtain across the swimming area. It keeps most things out. Most.', baseCost: 400, covers: 8 },
  { id: 'tower', name: 'SPOTTER TOWER', short: 'TOWERS', description: 'A tall chair, binoculars, and a siren that clears the water in a minute flat.', baseCost: 6_000, covers: 40 },
  { id: 'patrol', name: 'PATROL BOAT', short: 'PATROL', description: 'An outboard runabout with a rifle under the seat. The captain says it has never been fired. The captain is lying.', baseCost: 90_000, covers: 250 },
  { id: 'plane', name: 'SPOTTER PLANE', short: 'PLANE', description: 'A floatplane flying the coast at dawn and dusk. From up there you can see how big they really are.', baseCost: 1_500_000, covers: 2_000 },
];

/** Swimmers, for the log. */
export const SWIMMERS = ['A LATE-NIGHT SWIMMER', 'A BOY ON A RAFT', 'A HONEYMOONER', 'A LIFEGUARD ON HER DAY OFF', 'A SURFER PAST THE BREAK', 'A KID ON AN INFLATABLE', 'A MAN WALKING HIS DOG IN THE SHALLOWS', 'A TOURIST FROM INLAND'];
