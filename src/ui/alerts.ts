import { formatDuration, formatNumber } from '../shared/format';
import { CREW } from '../data/crew';
import { crewNeedingAttention } from '../mission/crew';
import { directiveDef, directiveProgress } from '../mission/directives';
import { scenarioOf } from '../mission/registry';
import type { MissionState } from '../mission/state';
import { h, setAttr, setText } from '../shared/ui/dom';

const BAR_CELLS = 12;

/**
 * A strip at the top of the screen for things that need the player: the active directive with its
 * progress, and crew who are exhausted or tiring. Each item jumps to its panel.
 */
export function createAlerts(open: (panel: string) => void): { el: HTMLElement; render(m: MissionState): void } {
  const dirTitle = h('span', { class: 'alert-title' });
  const dirBar = h('span', { class: 'alert-bar', role: 'progressbar', 'aria-label': 'Directive progress', 'aria-valuemin': 0 });
  const dirTime = h('span', { class: 'alert-time' });
  const directive = h('button', { class: 'alert alert-directive', type: 'button' }, dirTitle, dirBar, dirTime);
  directive.addEventListener('click', () => open('directives'));

  const crewText = h('span', { class: 'alert-title' });
  const crew = h('button', { class: 'alert alert-crew', type: 'button' }, crewText);
  crew.addEventListener('click', () => open('crew'));

  const el = h('section', { class: 'alerts', 'aria-label': 'Alerts', hidden: true }, directive, crew);

  function render(m: MissionState) {
    const scenario = scenarioOf(m);
    const def = m.directive && directiveDef(m.directive.id, scenario);
    directive.hidden = !def;
    if (m.directive && def) {
      const { current, target } = directiveProgress(m, scenario);
      const filled = Math.floor((current / target) * BAR_CELLS);
      setText(dirTitle, def.id.toUpperCase());
      setText(dirBar, '[' + '|'.repeat(filled) + '·'.repeat(BAR_CELLS - filled) + ']');
      setAttr(dirBar, 'aria-valuenow', String(Math.floor(current)));
      setAttr(dirBar, 'aria-valuemax', String(target));
      setAttr(dirBar, 'aria-valuetext', `${formatNumber(current)} of ${formatNumber(target)}`);
      setText(dirTime, `T-${formatDuration(Math.max(0, def.duration - (m.elapsed - m.directive.issuedAt)))}`);
      setAttr(directive, 'aria-label', `Open directive ${def.id.toUpperCase()} ${def.title}`);
    }

    const { exhausted, tiring } = crewNeedingAttention(m);
    crew.hidden = exhausted.length === 0 && tiring.length === 0;
    crew.dataset.level = exhausted.length > 0 ? 'alert' : 'active';
    const names = exhausted.map((id) => CREW.find((c) => c.id === id)!.callsign);
    const text =
      exhausted.length > 0
        ? `${names.join(', ')} EXHAUSTED · RETURN TO CRYO`
        : `${tiring.length} CREW TIRING`;
    setText(crewText, text);
    setAttr(crew, 'aria-label', `Open crew: ${text.toLowerCase()}`);

    el.hidden = directive.hidden && crew.hidden;
  }

  return { el, render };
}
