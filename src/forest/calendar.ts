/** Real seconds per game day at Thistlegate: a day passes in 24 minutes, a bell every minute. */
export const DAY_SECONDS = 24 * 60;
const BELL_SECONDS = 60;

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
};

export function day(elapsed: number): number {
  return 1 + Math.floor(elapsed / DAY_SECONDS);
}

export function formatDay(elapsed: number): string {
  const bell = 1 + Math.floor((elapsed % DAY_SECONDS) / BELL_SECONDS);
  return `DAY ${day(elapsed)} · ${ordinal(bell)} BELL`;
}
