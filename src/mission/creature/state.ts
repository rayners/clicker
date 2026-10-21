/** The creature: the play-as-the-horror tier's organism. Pushed by the player, not by containment. */
export interface CreatureFields {
  horror: 'creature';
  /** How hard the player's creature is pushing on this mission right now. */
  push: number;
  /** Fractional progress toward its next taking. */
  stalk: number;
  /** Everything it has taken: equipment and crew. */
  taken: number;
  /** How close WARDEN is to working it out: rises with each taking, fades while nothing goes missing. */
  suspicion: number;
}
