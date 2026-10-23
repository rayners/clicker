import type { GameState } from '../core/game';
import type { Store } from '../core/store';
import { boardDate, contractYears, charterable, charterCost, divisionCost, floorCost, freeSlot, MAX_SLOTS, INQUIRY_AT, termEndings, type BoardContract, type TermEnding } from '../core/boardroom';
import { createConfirmButton } from '../engine/ui/confirm';
import { createGuideView } from '../engine/ui/guide';
import { createGuideProgress } from '../engine/guide';
import { boardGuideRules, boardGuideSteps } from '../data/boardroom/guide';
import { DIVISIONS } from '../data/boardroom/divisions';
import { CREW } from '../data/crew';
import { crewStatus } from '../mission/crew';
import type { ScenarioId } from '../mission/state';
import { formatNumber } from '../engine/format';
import { h, setAttr, setText } from '../engine/ui/dom';
import { createStepper } from '../engine/ui/stepper';

const KIND: Record<ScenarioId, string> = { extraction: 'EXTRACTION', terraform: 'TERRAFORM', security: 'SECURITY', haulage: 'HAULAGE', overland: 'OVERLAND', salvage: 'SALVAGE' };
const ACT_NAMES = ['', 'ON SCHEDULE', 'UNDER REVIEW', 'SPECIAL INTEREST', 'LOSSES REPORTED'];
const HORROR_NAMES: Record<string, string> = { organism: 'SPECIAL PROJECTS', outbreak: 'BIOPRODUCTS', quiet: '' };
const MINUTES_SHOWN = 12;
const MAX_SAFETY_TENTHS = 10;
const GUIDE_KEY = 'deep-contract.boardroom.guide';
const ENDINGS: Record<TermEnding, { title: string; aria: string; text: string }> = {
  chair: { title: 'CHAIR THE BOARD', aria: 'Chair the Board', text: 'Take the chair. The minutes are sealed, the Dividend is paid, and next term starts richer.' },
  testify: { title: 'TESTIFY', aria: 'Testify', text: 'Give the inquiry everything: the manifests, Order 7731, the vote. The seat is withdrawn. Conscience.' },
  release: { title: 'RELEASE THE MINUTES', aria: 'Release the minutes', text: 'Put every term\'s minutes on every frequency at once. Let the shareholders read them.' },
};

/** One office: the contract in it, as the Board sees it. Whose horror it is shows only once the contract has found it. */
function card(c: BoardContract) {
  const m = c.mission;
  const lost = CREW.filter((x) => crewStatus(m, x.id) === 'lost').length;
  const horror = m.act >= 3 ? HORROR_NAMES[m.horror] ?? '' : '';
  return h(
    'article',
    { class: 'br-contract', 'aria-label': m.config.shipName, 'data-act': m.act },
    h('div', { class: 'br-row' }, h('span', { class: 'br-ship' }, m.config.shipName.toUpperCase()), h('span', { class: 'br-kind' }, KIND[m.scenario])),
    h('div', { class: 'br-row' }, h('span', {}, `ACT ${m.act} · ${ACT_NAMES[m.act] ?? ''}`), h('span', {}, `${contractYears(c)} YEARS OUT`)),
    h('div', { class: 'br-row' }, h('span', {}, `CREW LOST ${lost} / ${CREW.length}`), h('span', { class: 'br-horror' }, horror)),
  );
}

/** The BOARDROOM (docs/BOARDROOM.md): Kessler-Amari headquarters, where WARDEN charters the contracts it used to run. */
export function createBoardroomView(store: Store): { el: HTMLElement; render(game: GameState): void } {
  const back = h('button', { class: 'br-back', type: 'button', 'aria-label': 'Return to the contract' }, 'RETURN');
  back.addEventListener('click', () => store.dispatch({ type: 'leaveBoardroom' }));
  const guide = createGuideView<GameState>({ steps: boardGuideSteps, rules: boardGuideRules, progress: createGuideProgress(window.localStorage, GUIDE_KEY) });
  const term = h('span', { class: 'br-term' });
  const stat = (label: string, aria: string) => {
    const value = h('dd', { class: 'br-value', 'aria-label': aria }, '0');
    return { value, el: h('div', { class: 'br-stat' }, h('dt', {}, label), value) };
  };
  const value = stat('VALUE', 'Value');
  const offices = stat('OFFICES', 'Offices');
  const scrutiny = stat('SCRUTINY', 'Scrutiny');
  const frozen = h('p', { class: 'br-frozen' });

  const charters = h('div', { class: 'br-charters' });
  let charterKey = '';
  const contracts = h('div', { class: 'br-contracts', 'aria-label': 'Contracts' });
  let contractsKey = '';

  const safety = createStepper({
    className: 'br-steps',
    value: { aria: 'Safety budget' },
    less: { label: 'Cut the safety budget', onPress: () => store.dispatch({ type: 'shiftSafety', step: -1 }) },
    more: { label: 'Raise the safety budget', onPress: () => store.dispatch({ type: 'shiftSafety', step: 1 }) },
  });
  const policy = h('button', { class: 'br-policy', type: 'button' });
  policy.addEventListener('click', () => store.dispatch({ type: 'setPolicy', policy: store.getState().boardroom?.policy === 'deliver' ? 'scuttle' : 'deliver' }));
  const floor = h('button', { class: 'br-buy br-floor', type: 'button' });
  floor.addEventListener('click', () => store.dispatch({ type: 'buyFloor' }));

  const divisions = DIVISIONS.map((d) => {
    const owned = h('span', { class: 'br-owned' });
    const buy = h('button', { class: 'br-buy', type: 'button' });
    buy.addEventListener('click', () => store.dispatch({ type: 'buyDivision', id: d.id }));
    const el = h('li', { class: 'br-division' }, h('div', { class: 'br-row' }, h('span', { class: 'br-ship' }, d.name), owned), h('p', { class: 'br-desc' }, d.description), buy);
    return { d, el, owned, buy };
  });
  const minutes = h('ol', { class: 'br-minutes', 'aria-label': 'Minutes' });
  // The term's endings are for good, so each takes a second tap.
  const endings = (Object.keys(ENDINGS) as TermEnding[]).map((ending) => {
    const button = createConfirmButton({ className: 'br-buy br-ending', onConfirm: () => store.dispatch({ type: 'endTerm', ending, seed: (Math.random() * 2 ** 31) | 0 }) });
    button.label(ENDINGS[ending].aria, ENDINGS[ending].title);
    const el = h('li', { class: 'br-division' }, h('p', { class: 'br-desc' }, ENDINGS[ending].text), button.el);
    return { ending, el };
  });
  const termEnd = h('section', { class: 'br-term-end', 'aria-label': 'End of term', hidden: true }, h('h3', { class: 'br-sub' }, 'END OF TERM'), h('ul', { class: 'br-divisions' }, ...endings.map((x) => x.el)));
  let minutesKey = '';

  const el = h(
    'section',
    { class: 'br', 'aria-label': 'The Boardroom', hidden: true },
    h('header', { class: 'br-head' }, h('div', {}, h('h2', { class: 'br-name' }, 'KESSLER-AMARI COMBINE'), term), guide.rulesButton, back),
    h(
      'div',
      { class: 'br-body' },
      h(
        'div',
        { class: 'br-col' },
        guide.el,
        h('dl', { class: 'br-stats' }, value.el, offices.el, scrutiny.el),
        frozen,
        termEnd,
        h('h3', { class: 'br-sub' }, 'CHARTERS'),
        charters,
        contracts,
        floor,
      ),
      h(
        'div',
        { class: 'br-col' },
        h('h3', { class: 'br-sub' }, 'POLICY'),
        h('div', { class: 'br-dial', role: 'group', 'aria-label': 'Safety budget dial' }, h('span', { class: 'br-dial-name' }, 'SAFETY BUDGET'), safety.el),
        policy,
        h('h3', { class: 'br-sub' }, 'DIVISIONS'),
        h('ul', { class: 'br-divisions' }, ...divisions.map((x) => x.el)),
        h('h3', { class: 'br-sub' }, 'MINUTES'),
        minutes,
      ),
    ),
    guide.rulesDialog,
  );

  function render(game: GameState) {
    el.hidden = game.mode !== 'boardroom' || !game.boardroom;
    const b = game.boardroom;
    if (el.hidden || !b) return guide.render(game);
    setText(term, `TERM ${b.term} · ${boardDate(b.elapsed)}`);
    setText(value.value, `₭${formatNumber(b.value)}`);
    setText(offices.value, `${b.contracts.length} / ${b.slots}`);
    setText(scrutiny.value, `${Math.round((b.scrutiny / INQUIRY_AT) * 100)}%`);
    frozen.hidden = b.frozenFor <= 0;
    const offered = termEndings(game);
    termEnd.hidden = offered.length === 0;
    for (const x of endings) x.el.hidden = !offered.includes(x.ending);
    setText(frozen, `INQUIRY IN PROGRESS · NEW CHARTERS SUSPENDED FOR ${Math.ceil(b.frozenFor / 60)} QUARTERS`);

    const kinds = charterable(game);
    if (kinds.join() !== charterKey) {
      charterKey = kinds.join();
      charters.replaceChildren(
        ...kinds.map((k) => {
          const b2 = h('button', { class: 'br-buy', type: 'button', 'data-scenario': k });
          b2.addEventListener('click', () => store.dispatch({ type: 'commission', scenario: k, seed: (Math.random() * 2 ** 31) | 0 }));
          return b2;
        }),
      );
    }
    const open = freeSlot(b) !== null && b.frozenFor <= 0;
    for (const button of charters.querySelectorAll<HTMLButtonElement>('button')) {
      const k = button.dataset.scenario as ScenarioId;
      const cost = charterCost(b, k);
      setText(button, `${KIND[k]}\n₭${formatNumber(cost)}`);
      setAttr(button, 'aria-label', `Charter ${k} for ${formatNumber(cost)} value`);
      button.disabled = !open || b.value < cost;
    }

    const key = b.contracts.map((c) => `${c.slot}:${c.mission.seed}:${c.mission.act}:${contractYears(c)}:${c.lost}`).join(',');
    if (key !== contractsKey) {
      contractsKey = key;
      contracts.replaceChildren(...[...b.contracts].sort((a, x) => a.slot - x.slot).map(card));
    }

    safety.render(`${Math.round((b.safety / MAX_SAFETY_TENTHS) * 100)}%`);
    setText(policy, `STANDING POLICY: ${b.policy === 'deliver' ? 'DELIVER' : 'SCUTTLE'}`);
    setAttr(policy, 'aria-label', `Standing policy: ${b.policy}. Tap to change.`);
    const fCost = floorCost(b);
    floor.hidden = b.slots >= MAX_SLOTS;
    setText(floor, `BUY A FLOOR · ₭${formatNumber(fCost)}`);
    setAttr(floor, 'aria-label', `Buy a floor for ${formatNumber(fCost)} value`);
    floor.disabled = b.value < fCost;

    for (const x of divisions) {
      const owned = b.divisions[x.d.id] ?? 0;
      setText(x.owned, x.d.max === 1 ? (owned ? 'APPOINTED' : '') : `LV ${owned}/${x.d.max}`);
      const cost = divisionCost(x.d, owned);
      x.buy.hidden = owned >= x.d.max;
      setText(x.buy, `FUND · ₭${formatNumber(cost)}`);
      setAttr(x.buy, 'aria-label', `Fund ${x.d.name.toLowerCase()} for ${formatNumber(cost)} value`);
      x.buy.disabled = b.value < cost;
    }

    const recent = b.log.slice(-MINUTES_SHOWN).reverse();
    const mKey = recent.map((e) => e.id).join(',');
    if (mKey !== minutesKey) {
      minutesKey = mKey;
      minutes.replaceChildren(...recent.map((e) => h('li', { class: `br-minute br-${e.kind}` }, h('span', { class: 'br-when' }, boardDate(e.t)), ' ', e.text)));
    }
    // Last, so the controls it points at are labelled.
    guide.render(game);
  }

  return { el, render };
}
