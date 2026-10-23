/**
 * Numbers and times for the screen.
 * @module
 */
const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const EPSILON = 1e-9;

function floorTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + EPSILON) / factor;
}

function threeSignificant(value: number): string {
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
  return floorTo(value, decimals).toFixed(decimals);
}

/**
 * A number for the screen: one decimal under 100, whole under 1,000, then three significant digits with a suffix
 * (k, M, B … Dc), then scientific. Always rounds down, so a price never reads as affordable early.
 */
export function formatNumber(n: number): string {
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 100) return String(floorTo(n, 1));
  if (n < 1000) return String(Math.floor(n));

  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    return threeSignificant(n / 1000 ** tier) + SUFFIXES[tier];
  }
  const exponent = Math.floor(Math.log10(n));
  return threeSignificant(n / 10 ** exponent) + 'e' + exponent;
}

/** A length of time, its two largest units: `2d 4h`, `3h 12m`, `5m 07s`, `42s`. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/** A running clock, `HH:MM:SS` (hours keep counting past 24). */
export function formatClock(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
