import { simulateRun } from '../src/sim/bot';
import { formatDuration } from '../src/engine/format';
import { scenarioOf } from '../src/mission/registry';
import { isOrganism, isOutbreak, type HorrorId, type ScenarioId } from '../src/mission/state';

const seeds = [1, 7, 42];
// npm run simulate [scenario|all] [outbreak]
const ALL: ScenarioId[] = ['overland', 'extraction', 'terraform', 'security', 'haulage', 'salvage'];
const scenarios: ScenarioId[] = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2] as ScenarioId] : ALL;
const horror = process.argv[3] as HorrorId | undefined;
for (const scenario of scenarios) {
  for (const seed of seeds) {
    const started = performance.now();
    if (horror && scenario === 'overland') continue;
    const run = simulateRun({ seed, scenario, horror, maxSeconds: 10 * 3600 });
    const m = run.final.mission;
    const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
    const story = scenarioOf(m).signals(m).progress;
    const notes = isOrganism(m)
      ? ` specimens ${Math.floor(m.specimens)} contacts ${m.contacts}`
      : isOutbreak(m)
        ? ` sick ${(m.sick * 100).toFixed(0)}% turned ${(m.turned * 100).toFixed(0)}% wards ${m.wards} lockdowns ${m.lockdowns}`
        : '';
    console.log(
      `${scenario} seed ${seed}: act2 ${at(run.actAt[2])} | act3 ${at(run.actAt[3])} | act4 ${at(run.actAt[4])} | terminus ${at(run.terminusAt)}` +
        ` | progress ${story}${notes} | ${Math.round(performance.now() - started)}ms`,
    );
  }
}
