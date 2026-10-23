import { formatNumber } from '../engine/format';
import { createGuideView } from '../engine/ui/guide';
import { createForestSound, soundCues } from './sound';
import { createPalisade } from './palisade';
import { createGuideProgress } from '../engine/guide';
import { forestGuideRules, forestGuideSteps } from '../forest-data/guide';
import { h, setText } from '../engine/ui/dom';
import { createFlow } from '../engine/ui/flow';
import { createLogView } from '../engine/ui/log';
import { createTabs } from '../engine/ui/tabs';
import { createActionButton } from '../engine/ui/action';
import { createShell } from '../engine/ui/shell';
import { createSpriteKit } from '../engine/ui/sprites';
import { CLASS_IDS } from '../forest-data/classes';
import { FOREST_SPRITES } from '../forest-data/sprites';
import { appraisalRate, available, delve, gatherRate, netRate } from '../forest/company';
import { formatDay } from '../forest/calendar';
import type { Company, EntryKind } from '../forest/state';
import type { ForestGame } from '../forest/game';
import type { ForestStore } from '../forest/store';
import { createBoard } from './board';
import { createExpeditions } from './expeditions';
import { createHall } from './hall';
import { createRoster } from './roster';
import { createMapStrip } from './map';
import { createConfig } from './config';
import { createReckoning } from './reckoning';
import { createWoodView } from './wood';
import { createDragonView } from './dragon';
import { KEY_FRAGMENTS } from '../forest/company';
import { FLOORS } from '../forest-data/keep';
import { held } from '../engine/ground';
import { availableUpgrades } from '../forest/company';

const PER_MINUTE = 60;
const BLIGHT_WARNING = 50;
const TREE_COPIES = 12;

const kit = createSpriteKit({
  sprites: FOREST_SPRITES,
  paletteVars: { a: '--faint', b: '--ink-dim', c: '--ink', d: '--gilt', e: '--rubric' },
  fallback: '#e8dcc0',
});

function stat(label: string, aria: string) {
  const value = h('dd', { class: 'stat-value', 'aria-label': aria }, '0');
  return { value, el: h('div', { class: 'stat' }, h('dt', { class: 'stat-label' }, label), value) };
}

export function mountForest(root: HTMLElement, store: ForestStore): void {
  const config = createConfig(store);
  const palisade = createPalisade(store);
  // The walkthrough (docs/ROADMAP.md 6b): a tip above the forage button, the rules a tap away in the masthead.
  const guide = createGuideView<ForestGame>({ steps: forestGuideSteps, rules: forestGuideRules, progress: createGuideProgress(window.localStorage, 'elderdark.guide') });
  const woodView = createWoodView(store);
  const dragonView = createDragonView(store);
  const dayStamp = h('span', { class: 'mast-day' });
  const masthead = h(
    'header',
    { class: 'masthead' },
    h('div', { class: 'mast-brand' }, h('span', { class: 'brand-name' }, 'The Company of the Ashen Key')),
    h('div', { class: 'mast-line' }, h('span', { class: 'mast-place' }, 'LEDGER · THISTLEGATE'), h('span', { class: 'mast-right' }, dayStamp, guide.rulesButton, palisade.button, config.button)),
    // Repeated at native pixel scale (alternate copies mirrored) rather than stretched.
    h('div', { class: 'mast-trees', 'aria-hidden': 'true' }, ...Array.from({ length: TREE_COPIES }, () => kit.spriteCanvas('treeline', 'mast-tree'))),
  );

  const flow = createFlow<Company>({
    cells: [
      { label: 'GATHER', aria: 'Relics gathered per minute', unit: 'RELICS/MIN' },
      { label: 'APPRAISE', aria: 'Appraisal per minute', unit: 'RELICS/MIN' },
      { label: 'COFFERS', aria: 'Net thalers per minute', unit: '₮/MIN' },
    ],
    meterLabel: 'Blight',
    rateUnit: 'RELICS/MIN',
    identity: (c) => String(c.seed),
    read: (c) => {
      const gather = gatherRate(c) * PER_MINUTE;
      const appraise = appraisalRate(c) * PER_MINUTE;
      const net = netRate(c) * PER_MINUTE;
      const blight = c.blight >= BLIGHT_WARNING ? ` · BLIGHT ${Math.round(c.blight)}%: THE HANDS DREAM OF ROOTS` : '';
      const base = { values: [gather, appraise, net] as [number, number, number], meter: c.blight, rate: gather };
      if (net < 0) return { ...base, limit: 'wages', highlight: 2, severe: true, note: `WAGES OUTRUN INCOME · SEND PARTIES OR LET HANDS GO${blight}` };
      if (gather > appraise) return { ...base, limit: 'appraisal', highlight: 1, severe: true, note: `APPRAISERS BEHIND · RELICS PILE UP IN THE VAULT${blight}` };
      return { ...base, limit: 'gathering', highlight: 0, severe: false, note: (gather === 0 ? 'NO PARTIES IN THE WOOD · FORAGE OR SEND ONE' : 'APPRAISERS IDLE · SEND MORE PARTIES') + blight };
    },
  });

  const silver = stat('THALERS', 'Thalers');
  const vault = stat('VAULT', 'Vault relics');
  const ready = stat('READY', 'Hands ready');
  const depth = stat('DELVE', 'Delve');
  const keys = stat('THE KEY', 'Key fragments');
  const lost = stat('TURNED', 'Turned');
  keys.el.classList.add('stat-dark');
  lost.el.classList.add('stat-dark');
  // The tabs are made below; the strip only reaches for them on a tap.
  const map = createMapStrip(() => tabs.select('expeditions'));
  const standing = h(
    'section',
    { class: 'status', 'aria-label': 'Company standing' },
    map.el,
    flow.el,
    h('dl', { class: 'stats' }, silver.el, vault.el, ready.el, depth.el, keys.el, lost.el),
  );

  const log = createLogView<EntryKind>({ label: 'Company ledger', stamp: formatDay });
  const board = createBoard();
  const expeditions = createExpeditions(store);
  const rosterPanel = createRoster(store);
  const hall = createHall(store);
  const reckoning = createReckoning(store);
  // On desktop the ledger is always shown; the side column shows the chosen section (expeditions by default).
  const tabs = createTabs<ForestGame>({
    label: 'Ledger sections',
    home: 'ledger',
    side: 'expeditions',
    root,
    panels: [
      {
        id: 'ledger',
        label: 'LEDGER',
        content: [board.el, log.el],
        render: (g) => {
          board.render(g.company);
          log.render(g.company.log, String(g.company.seed));
        },
      },
      { id: 'expeditions', label: 'EXPEDITIONS', content: [expeditions.el], render: (g) => expeditions.render(g.company) },
      { id: 'roster', label: 'ROSTER', content: [rosterPanel.el], render: (g) => rosterPanel.render(g.company) },
      { id: 'hall', label: 'HALL', content: [hall.el], render: (g) => hall.render(g.company), attention: (g) => availableUpgrades(g.company).some((u) => u.cost <= g.company.silver) },
      { id: 'reckoning', label: 'RECKONING', content: [reckoning.el], render: (g) => reckoning.render(g), visible: (g) => g.company.flags.includes('terminus'), attention: () => true },
    ],
  });

  const keyBit = kit.spriteCanvas('key', 'forage-sprite');
  const sound = createForestSound();
  root.addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  let foraged = false;
  let lastCompany: Company | null = null;
  const forage = createActionButton({
    className: 'forage',
    label: 'Forage the eaves',
    content: [keyBit, h('span', { class: 'forage-label' }, 'FORAGE THE EAVES')],
    onPress: () => {
      foraged = true;
      store.dispatch({ type: 'forage' });
      kit.advanceFrame(keyBit);
      kit.paintSprite(keyBit, palette);
      return '+1';
    },
  });

  const shell = createShell(root, {
    className: 'ledger-shell',
    parts: [masthead, standing, ...tabs.sections, h('div', { class: 'forage-bay' }, guide.el, forage.el), tabs.tabbar],
    overlays: [woodView.el, dragonView.el, config.dialog, palisade.dialog, guide.rulesDialog],
  });
  const palette = kit.readPalette(root);
  kit.paintAll(root);

  function render(game: ForestGame) {
    const c = game.company;
    setText(dayStamp, formatDay(c.elapsed));
    flow.render(c);
    setText(silver.value, formatNumber(c.silver));
    setText(vault.value, formatNumber(c.relics));
    setText(ready.value, String(CLASS_IDS.reduce((s, id) => s + available(c, id), 0)));
    setText(depth.value, c.site === 'keep' ? `${held(c.floors)} / ${FLOORS.length} FLOORS` : `${delve(c).toFixed(1)} LEAGUES`);
    keys.el.hidden = c.keyFragments === 0;
    setText(keys.value, `${c.keyFragments} / ${KEY_FRAGMENTS}`);
    lost.el.hidden = c.turned === 0;
    setText(lost.value, String(c.turned));
    map.render(c);
    root.dataset.motion = game.profile.settings.reducedMotion ? 'reduced' : 'full';
    config.render(game);
    woodView.render(game);
    palisade.render(game);
    // Behind the wood or the dragon, the charter is out of reach.
    shell.cover(game.mode !== 'charter');
    const charter = game.mode === 'charter';
    sound.setEnabled(game.profile.settings.sound);
    sound.setHum(charter ? c.act : 0);
    // A new charter starts the comparison over, so its first frame makes no sound of its own.
    if (charter && lastCompany && lastCompany.seed === c.seed) for (const cue of soundCues(lastCompany, c, foraged)) sound.play(cue);
    foraged = false;
    lastCompany = c;
    guide.render(game);
    dragonView.render(game);
    root.dataset.mode = game.mode;
    tabs.render(game);
  }

  store.subscribe(render);
  render(store.getState());
}
