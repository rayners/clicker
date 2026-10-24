import { readFileSync } from 'node:fs';
import { formatDuration } from '../src/engine/format';
import { compileGame } from '../src/engine/data/game';
import { playDataGame } from '../src/engine/data/bot';

// Usage: npm run simulate:data games/<file>.json [hours]
const file = process.argv[2] ?? 'games/clip-works.json';
const hours = Number(process.argv[3] ?? 6);
const game = compileGame(JSON.parse(readFileSync(file, 'utf8')));
const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
for (const seed of [1, 7, 42]) {
  const run = playDataGame(game, { seed, maxSeconds: hours * 3600 });
  const acts = Object.entries(run.actAt).filter(([a]) => a !== '1').map(([a, t]) => `act${a} ${at(t)}`).join(' ');
  console.log(`seed ${seed}: ${acts} end ${at(run.doneAt)}`);
}
