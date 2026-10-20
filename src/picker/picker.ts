import { h } from '../shared/ui/dom';

export interface GameDoor {
  id: 'contract' | 'elderdark' | 'latefees';
  href: string;
  /** The game's localStorage save key (kept in step with the games by a test; the picker never imports them). */
  saveKey: string;
  icon: string;
  overline: string;
  title: string;
  blurb: string;
  motto: string;
  begin: string;
  resume: string;
}

export const GAMES: GameDoor[] = [
  {
    id: 'contract',
    href: './contract/',
    saveKey: 'deep-contract.save',
    icon: './contract/icons/icon-192.png',
    overline: 'KESSLER-AMARI COMBINE · OPERATIONS TERMINAL',
    title: 'DEEP CONTRACT',
    blurb: "You are WARDEN, the ship's operations intelligence. Strip-mine a moonlet, keep the crew productive, and haul the ore home. Eleven years each way.",
    motto: 'Building Better Futures, Further Out.',
    begin: 'BEGIN CONTRACT',
    resume: 'RESUME CONTRACT',
  },
  {
    id: 'elderdark',
    href: './forest/',
    saveKey: 'elderdark.save',
    icon: './forest/icons/icon-192.png',
    overline: 'Thistlegate · on the edge of the wood',
    title: 'Charter of the Elderdark',
    blurb: 'Keep the ledger of the Company of the Ashen Key. Send parties under the trees for relics, mend the ones who return, and count the ones who don’t.',
    motto: 'What the wood gives, it remembers.',
    begin: 'Begin the charter',
    resume: 'Resume the charter',
  },
  {
    id: 'latefees',
    href: './late-fees/',
    saveKey: 'latefees.save',
    icon: './late-fees/icons/icon-192.png',
    overline: 'LATE FEES VIDEO · HORROR SECTION',
    title: 'LATE FEES',
    blurb: 'Run the summer camp at Blackwater Lake. Keep the gates open, the lights on and the bunks full while the body count climbs. Every film gets a sequel.',
    motto: 'Be kind. Rewind.',
    begin: 'PRESS PLAY',
    resume: 'RESUME TAPE',
  },
];

function hasSave(storage: Storage, key: string): boolean {
  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/** The front page: one door per game, offering to resume where this device has a save. */
export function mountPicker(root: HTMLElement, storage: Storage): void {
  const doors = GAMES.map((game) =>
    h(
      'a',
      { class: `door door-${game.id}`, href: game.href },
      h(
        'span',
        { class: 'door-inner' },
        h('span', { class: 'door-overline' }, game.overline),
        h('img', { class: 'door-icon', src: game.icon, alt: '', width: 96, height: 96 }),
        h('h2', { class: 'door-title' }, game.title),
        h('span', { class: 'door-blurb' }, game.blurb),
        h('span', { class: 'door-motto' }, game.motto),
        h('span', { class: 'door-cta' }, hasSave(storage, game.saveKey) ? game.resume : game.begin),
      ),
    ),
  );
  root.replaceChildren(
    h(
      'main',
      { class: 'picker' },
      h('h1', { class: 'visually-hidden' }, 'Choose a game'),
      ...doors,
      h('p', { class: 'picker-foot' }, 'All three run in your browser and save on this device. Add one to your home screen to play offline.'),
    ),
  );
}
