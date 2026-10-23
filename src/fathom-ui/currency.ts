import { formatNumber } from '../engine/format';
import type { Currency } from '../engine/ui/buy-list';

/** Dollars, on a button and aloud. */
export const DOLLARS: Currency = { text: (n) => `$${formatNumber(n)}`, spoken: (n) => `$${formatNumber(n)}` };
