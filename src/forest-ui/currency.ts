import { formatNumber } from '../engine/format';
import type { Currency } from '../engine/ui/buy-list';

/** Thalers, after a dot on the button: `BUILD · 12 ₮`, "12 thalers" aloud. */
export const THALERS: Currency = { text: (n) => `${formatNumber(n)} ₮`, spoken: (n) => `${formatNumber(n)} thalers`, separator: ' · ' };
