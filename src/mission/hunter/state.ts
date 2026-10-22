/** The hunter: the play-as-the-horror tier's second DEEP CONTRACT horror. Hunts for sport, by a code. */
export interface HunterFields {
  horror: 'hunter';
  /** How hard the player's hunter is pushing on this mission right now. */
  push: number;
  /** Fractional progress toward its next glimpse or kill. */
  stalk: number;
  /** Trophy value taken: an officer on watch counts for more than a piece of equipment. */
  trophies: number;
  /** How far the crew has armed itself and gone looking: rises with each sighting and kill, fades while nothing is seen. */
  alert: number;
}
