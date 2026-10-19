import { unlockedFiles } from '../mission/archive';
import type { MissionState } from '../mission/state';
import { h } from './dom';

export function createArchivePanel(): { el: HTMLElement; render(m: MissionState): void } {
  const list = h('div', { class: 'arc-list' });
  const shown = new Set<string>();
  const el = h(
    'section',
    { class: 'panel panel-archive', role: 'tabpanel', id: 'panel-archive', 'aria-labelledby': 'tab-archive' },
    h('h2', { class: 'panel-title' }, 'ARCHIVE'),
    list,
  );

  function render(m: MissionState) {
    for (const file of unlockedFiles(m)) {
      if (shown.has(file.id)) continue;
      shown.add(file.id);
      const restricted = file.classification.includes('EYES ONLY');
      list.append(
        h(
          'details',
          { class: `arc-file${restricted ? ' arc-restricted' : ''}` },
          h('summary', {}, h('span', { class: 'arc-title' }, file.title), h('span', { class: 'arc-class' }, file.classification)),
          ...file.body.map((line) => h('p', { class: 'arc-line' }, line)),
        ),
      );
    }
  }

  return { el, render };
}
