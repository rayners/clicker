import './engine/ui/engine.css';
import './engine/ui/theme.css';
import { runDataGame } from './engine/data/run';
import type { GameDefinition } from './engine/data/definition';
import { mountGameList } from './made/list';

// Every definition in games/ is bundled at build time; ?game=<id> plays one, and the bare page lists them.
const games = Object.values(import.meta.glob('../games/*.json', { eager: true, import: 'default' }) as Record<string, GameDefinition>);
const id = new URLSearchParams(location.search).get('game');
const chosen = games.find((g) => g.id === id);

if (chosen) {
  document.title = chosen.title;
  runDataGame(chosen, { dev: import.meta.env.DEV, prod: import.meta.env.PROD });
} else {
  mountGameList(document.getElementById('app')!, games);
}
