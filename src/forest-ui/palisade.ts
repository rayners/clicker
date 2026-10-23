import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { DRAGON_LEGEND, DRAGON_UNLOCK_CHARTERS, isDragonUnlocked, isWoodUnlocked, WOOD_UNLOCK_CHARTERS } from '../forest/charter';
import { createDoors } from '../engine/ui/doors';

const seed = () => (Math.random() * 2 ** 31) | 0;

/** Beyond the palisade: playing as the wood or the dragon, behind its own door rather than in the configuration. */
export function createPalisade(store: ForestStore) {
  return createDoors<ForestGame>({
    button: { text: '☾', aria: 'Beyond the palisade', className: 'cfg-open palisade-open' },
    title: 'Beyond the palisade',
    doors: [
      {
        describe: 'Hear the companies as the wood hears them, and lean on the ones who go too deep.',
        render: (g) => {
          const open = !!g.wood || isWoodUnlocked(g.profile);
          const text = g.wood ? 'RETURN TO THE WOOD' : open ? 'LISTEN TO THE WOOD' : `LISTEN TO THE WOOD · AFTER ${WOOD_UNLOCK_CHARTERS} CHARTERS`;
          return { text, aria: 'Listen to the wood', disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'startWood', seed: seed() }),
      },
      {
        describe: 'Under the Heartwood something has been asleep on a hoard. It could wake.',
        render: (g) => {
          const open = !!g.dragon || isDragonUnlocked(g.profile);
          const text = g.dragon ? 'RETURN TO THE HOARD' : open ? 'WAKE THE DRAGON' : `WAKE THE DRAGON · AFTER ${DRAGON_UNLOCK_CHARTERS} CHARTERS OR ${DRAGON_LEGEND} LEGEND`;
          return { text, aria: 'Wake the dragon', disabled: !open };
        },
        onOpen: () => store.dispatch({ type: 'wakeDragon', seed: seed() }),
      },
    ],
  });
}
