import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import {
  BOARDROOM_UNLOCK_CONTRACTS,
  CREATURE_UNLOCK_CONTRACTS,
  HUNTER_LEGEND,
  HUNTER_UNLOCK_CONTRACTS,
  isBoardroomUnlocked,
  isCreatureUnlocked,
  isHunterUnlocked,
} from '../core/prestige';
import { createDoors } from '../engine/ui/doors';

const seed = () => (Math.random() * 2 ** 31) | 0;

/** Until the first contract is done, nothing behind the door has a name. */
const RESTRICTED = { text: 'RESTRICTED · CLEARANCE REQUIRED', aria: 'Restricted: clearance required', disabled: true, secret: true };
const cleared = (g: GameState) => g.profile.contractsCompleted >= 1;

/**
 * The restricted files: DEEP CONTRACT's other sides (Special Order 0-77, the hunt, the Boardroom), behind their own
 * masthead button rather than in the settings beside hard reset.
 */
export function createRestricted(store: Store) {
  return createDoors<GameState>({
    button: { text: 'CLR', aria: 'Restricted files', className: 'cfg-open restricted-open' },
    title: 'RESTRICTED FILES',
    doors: [
      {
        describe: 'Classified. Special Projects authority.',
        render: (g) => {
          if (g.creature) return { text: 'SPECIAL ORDER 0-77: RESUME', aria: 'Accept Special Order 0-77', disabled: false };
          if (!cleared(g)) return RESTRICTED;
          const open = isCreatureUnlocked(g.profile);
          return { text: open ? 'SPECIAL ORDER 0-77: ACCEPT' : `SPECIAL ORDER 0-77 · AFTER ${CREATURE_UNLOCK_CONTRACTS} CONTRACTS`, aria: 'Accept Special Order 0-77', disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'startCreature', seed: seed() }),
      },
      {
        describe: 'Something else is out here, and it is not on any manifest.',
        render: (g) => {
          if (g.hunter) return { text: 'THE HUNT: RESUME', aria: 'Accept the hunt', disabled: false };
          if (!cleared(g)) return RESTRICTED;
          const open = isHunterUnlocked(g.profile);
          return { text: open ? 'THE HUNT: ACCEPT' : `THE HUNT · AFTER ${HUNTER_UNLOCK_CONTRACTS} CONTRACTS OR ${HUNTER_LEGEND} LEGEND`, aria: 'Accept the hunt', disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'startHunter', seed: seed() }),
      },
      {
        describe: 'Kessler-Amari headquarters. Executive operations.',
        render: (g) => {
          if (g.boardroom) return { text: 'THE BOARDROOM: RETURN', aria: 'Return to the Boardroom', disabled: false };
          if (!cleared(g)) return RESTRICTED;
          const open = isBoardroomUnlocked(g.profile);
          const text = open ? 'THE BOARDROOM: ACCEPT PROMOTION' : `THE BOARDROOM · AFTER ${BOARDROOM_UNLOCK_CONTRACTS} CONTRACTS`;
          return { text, aria: open ? 'Accept promotion' : text.toLowerCase(), disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'enterBoardroom', seed: seed() }),
      },
    ],
  });
}
