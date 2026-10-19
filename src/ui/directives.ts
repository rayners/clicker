import { formatDuration, formatNumber } from '../core/format';
import { directiveDef, directiveProgress } from '../mission/directives';
import type { MissionState } from '../mission/state';
import { h, setAttr, setText } from './dom';

const BAR_CELLS = 20;

export function hasDirectivesToShow(m: MissionState): boolean {
  return m.directive !== null || Object.keys(m.directiveResults).length > 0;
}

export function createDirectivesPanel(): { el: HTMLElement; render(m: MissionState): void } {
  const title = h('div', { class: 'dir-title' });
  const brief = h('p', { class: 'sys-desc' });
  const progress = h('div', { class: 'dir-bar', role: 'progressbar', 'aria-label': 'Directive progress', 'aria-valuemin': 0 });
  const progressText = h('span', { class: 'dir-count' });
  const timeLeft = h('span', { class: 'dir-time' });
  const reward = h('span', { class: 'dir-reward' });
  const activeBody = h(
    'div',
    { class: 'dir-body' },
    title,
    brief,
    progress,
    h('div', { class: 'sys-foot' }, progressText, timeLeft),
    h('div', { class: 'sys-foot' }, h('span', { class: 'sys-rate' }, 'BONUS ON COMPLETION'), reward),
  );
  const idle = h('p', { class: 'dir-idle' }, 'AWAITING TRANSMISSION FROM COMBINE HQ_');
  const active = h('section', { class: 'dir-active', 'aria-label': 'Active directive' }, activeBody, idle);
  const history = h('ul', { class: 'dir-history', 'aria-label': 'Directive history' });
  let historyCount = -1;

  const el = h(
    'section',
    { class: 'panel panel-directives', role: 'tabpanel', id: 'panel-directives', 'aria-labelledby': 'tab-directives' },
    h('h2', { class: 'panel-title' }, 'CORPORATE DIRECTIVES'),
    active,
    h('h3', { class: 'panel-subtitle' }, 'RECORD'),
    history,
  );

  function render(m: MissionState) {
    const def = m.directive && directiveDef(m.directive.id);
    activeBody.hidden = !def;
    idle.hidden = !!def;
    if (m.directive && def) {
      const { current, target } = directiveProgress(m);
      setText(title, `${def.id.toUpperCase()} // ${def.title}`);
      setText(brief, def.brief);
      setAttr(progress, 'aria-valuemax', String(target));
      setAttr(progress, 'aria-valuenow', String(Math.floor(current)));
      const filled = Math.floor((current / target) * BAR_CELLS);
      setText(progress, '[' + '|'.repeat(filled) + ' '.repeat(BAR_CELLS - filled) + ']');
      setText(progressText, `${formatNumber(current)} / ${formatNumber(target)}`);
      setText(timeLeft, `T-${formatDuration(Math.max(0, def.duration - (m.elapsed - m.directive.issuedAt)))}`);
      setText(reward, `${formatNumber(def.reward)} CR`);
    }
    const results = Object.entries(m.directiveResults);
    if (results.length !== historyCount) {
      historyCount = results.length;
      history.replaceChildren(
        ...results.reverse().map(([id, result]) =>
          h(
            'li',
            { class: `dir-past dir-${result}` },
            h('span', {}, `${id.toUpperCase()} ${directiveDef(id)?.title ?? ''}`),
            h('span', { class: 'dir-outcome' }, result === 'completed' ? 'COMPLETE' : 'LAPSED'),
          ),
        ),
      );
    }
  }

  return { el, render };
}
