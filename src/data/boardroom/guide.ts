import type { GuideRules, GuideStep } from '../../shared/guide';
import type { GameState } from '../../core/game';

/** The Boardroom's walkthrough (docs/BOARDROOM.md): the Board's levers in the order they matter. */
type Step = GuideStep<GameState>;

const open = (test: (b: NonNullable<GameState['boardroom']>) => boolean) => (g: GameState) => g.mode === 'boardroom' && !!g.boardroom && test(g.boardroom);

const STEPS: Step[] = [
  {
    id: 'br-charter',
    title: 'CHARTER A CONTRACT',
    text: 'Every office runs one contract, played by its own WARDEN. A charter costs value; a delivery pays it back several times over.',
    target: '.br-charters',
    show: open(() => true),
    done: open((b) => b.contracts.length > 0 || b.ledger.length > 0),
  },
  {
    id: 'br-years',
    title: 'YEARS, NOT HOURS',
    text: 'A minute here is a fiscal quarter. A contract comes home about eleven years after it leaves.',
    target: '.br-contracts',
    show: open((b) => b.contracts.length > 0),
    done: () => false,
  },
  {
    id: 'br-safety',
    title: 'THE SAFETY BUDGET',
    text: 'Applies to every running contract. Higher means fewer losses and costs value every quarter; lower is cheaper, and crews die.',
    target: '.br-dial',
    show: open((b) => b.contracts.length > 0),
    done: open((b) => b.safety !== 5),
  },
  {
    id: 'br-floor',
    title: 'MORE OFFICES',
    text: 'A floor adds an office, and an office runs another contract at the same time.',
    target: '.br-floor',
    show: open((b) => b.ledger.length > 0),
    done: open((b) => b.slots > 1),
  },
  {
    id: 'br-scrutiny',
    title: 'SCRUTINY',
    text: 'Every crew member lost and every scuttled contract draws attention. At 100% an inquiry fines the Board and freezes new charters. Legal slows it.',
    target: '[aria-label="Scrutiny"]',
    show: open((b) => b.scrutiny > 20),
    done: open((b) => (b.divisions.legal ?? 0) > 0),
  },
];

export const boardGuideSteps = (_g: GameState): readonly Step[] => STEPS;

const RULES: GuideRules = {
  title: 'HOW THE BOARDROOM WORKS',
  sections: [
    { heading: 'CHARTERS', text: 'Each office runs one first-tier contract, played by its own WARDEN. When it reaches its terminus the Board closes it by the standing policy: deliver pays the charter back with interest, plus specimens and samples; scuttle pays almost nothing.' },
    { heading: 'TIME', text: 'A Board minute is a fiscal quarter. A contract is out about eleven years; a term runs some sixty.' },
    { heading: 'SAFETY AND SCRUTINY', text: 'The safety budget applies to every contract: fewer incidents and more berths, at a cost each quarter. Crew deaths and scuttles raise scrutiny; at 100% an inquiry fines a fifth of value and freezes charters.' },
    { heading: 'DIVISIONS', text: 'Personnel cheapens charters, Legal softens scrutiny, Special Projects and Bioproducts pay more for product, Logistics speeds contracts, and a COO keeps every office busy.' },
    { heading: 'THE TERM', text: 'A term ends in time. Chair the Board for a Dividend, Testify for Conscience, or, on a veteran board, release the minutes. Your own contract waits for you throughout.' },
  ],
};

export const boardGuideRules = (_g: GameState): GuideRules => RULES;
