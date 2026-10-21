import { simulateRun } from '../src/sim/bot';
import { formatDuration } from '../src/shared/format';
import { scenarioOf } from '../src/mission/registry';
import { isOrganism, type ScenarioId } from '../src/mission/state';

const seeds = [1, 7, 42];
const scenarios: ScenarioId[] = process.argv[2] ? [process.argv[2] as ScenarioId] : ['overland', 'extraction', 'terraform', 'security', 'haulage'];
for (const scenario of scenarios) {
  for (const seed of seeds) {
    const started = performance.now();
    const run = simulateRun({ seed, scenario, maxSeconds: 10 * 3600 });
    const m = run.final.mission;
    const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
    const story = scenarioOf(m).signals(m).progress;
    const horror = isOrganism(m) ? ` specimens ${Math.floor(m.specimens)} contacts ${m.contacts}` : '';
    console.log(
      `${scenario} seed ${seed}: act2 ${at(run.actAt[2])} | act3 ${at(run.actAt[3])} | act4 ${at(run.actAt[4])} | terminus ${at(run.terminusAt)}` +
        ` | progress ${story}${horror} | ${Math.round(performance.now() - started)}ms`,
    );
  }
}
