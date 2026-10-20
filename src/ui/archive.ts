import { formatDuration, formatNumber } from '../shared/format';
import type { GameState } from '../core/game';
import { BOARDROOM_UNLOCK_CONTRACTS } from '../core/prestige';
import { unlockedFiles } from '../mission/archive';
import { h, setText } from '../shared/ui/dom';

const ENDING_LABELS: Record<string, string> = { deliver: 'DELIVERED', scuttle: 'SCUTTLED', broadcast: 'BROADCAST' };

export function hasArchiveToShow(game: GameState): boolean {
  return unlockedFiles(game.mission).length > 0 || game.profile.history.length > 0;
}

export function createArchivePanel(): { el: HTMLElement; render(game: GameState): void } {
  const list = h('div', { class: 'arc-list' });
  const standing = h('p', { class: 'arc-standing' });
  const record = h('ul', { class: 'arc-record', 'aria-label': 'Contract record' });
  const recordSection = h('div', { class: 'arc-record-wrap' }, h('h3', { class: 'panel-subtitle' }, 'CONTRACT RECORD'), standing, record);
  let filesSignature = '';
  let recordCount = -1;

  const el = h(
    'section',
    { class: 'panel panel-archive', role: 'tabpanel', id: 'panel-archive', 'aria-labelledby': 'tab-archive' },
    h('h2', { class: 'panel-title' }, 'ARCHIVE'),
    list,
    recordSection,
  );

  function render(game: GameState) {
    const files = unlockedFiles(game.mission);
    const signature = files.map((f) => f.id).join(',');
    if (signature !== filesSignature) {
      // Keep already-rendered files (and their open state); rebuild only if something disappeared (new contract).
      const existing = new Map([...list.children].map((c) => [(c as HTMLElement).dataset.file, c]));
      if (files.some((f) => !existing.has(f.id)) || existing.size !== files.length) {
        list.replaceChildren(
          ...files.map((file) => {
            const kept = existing.get(file.id);
            if (kept) return kept;
            const restricted = file.classification.includes('EYES ONLY');
            return h(
              'details',
              { class: `arc-file${restricted ? ' arc-restricted' : ''}`, 'data-file': file.id },
              h('summary', {}, h('span', { class: 'arc-title' }, file.title), h('span', { class: 'arc-class' }, file.classification)),
              ...file.body.map((line) => h('p', { class: 'arc-line' }, line)),
            );
          }),
        );
      }
      filesSignature = signature;
    }

    const p = game.profile;
    recordSection.hidden = p.history.length === 0;
    setText(
      standing,
      `SENIORITY ${p.seniority} // CONSCIENCE ${p.conscience} // BOARD REVIEW ${Math.min(p.contractsCompleted, BOARDROOM_UNLOCK_CONTRACTS)}/${BOARDROOM_UNLOCK_CONTRACTS}`,
    );
    if (p.history.length !== recordCount) {
      recordCount = p.history.length;
      record.replaceChildren(
        ...p.history
          .map((c, i) =>
            h(
              'li',
              { class: 'arc-contract' },
              h('span', {}, `#${i + 1} ${c.shipName.toUpperCase()}`),
              h('span', { class: 'arc-ending' }, ENDING_LABELS[c.ending] ?? c.ending.toUpperCase()),
              h(
                'span',
                { class: 'arc-detail' },
                `${formatNumber(c.output)} ${c.outputUnit} // ${c.specimens} SPECIMENS // ${c.crewSurvived}/7 CREW // ${formatDuration(c.duration)}`,
              ),
            ),
          )
          .reverse(),
      );
    }
  }

  return { el, render };
}
