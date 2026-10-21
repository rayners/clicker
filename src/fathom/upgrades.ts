import { FATHOM_UPGRADES, type FathomEffect } from '../fathom-data/upgrades';
import type { Outfit } from './state';

export interface Effects {
  pass: number;
  autoPasses: number;
  attraction: Record<string, number>;
  guard: number;
  autoOpen: boolean;
  catch: number;
  autoRange: boolean;
  research: number;
  autoEnhance: boolean;
  sample: number;
  autoStation: boolean;
  levy: number;
}

function apply(m: Effects, e: FathomEffect): void {
  switch (e.kind) {
    case 'passMultiplier':
      m.pass *= e.value;
      break;
    case 'autoPasses':
      m.autoPasses += e.value;
      break;
    case 'attractionMultiplier':
      m.attraction[e.attraction] = (m.attraction[e.attraction] ?? 1) * e.value;
      break;
    case 'guardMultiplier':
      m.guard *= e.value;
      break;
    case 'autoOpen':
      m.autoOpen = true;
      break;
    case 'catchMultiplier':
      m.catch *= e.value;
      break;
    case 'autoRange':
      m.autoRange = true;
      break;
    case 'researchMultiplier':
      m.research *= e.value;
      break;
    case 'autoEnhance':
      m.autoEnhance = true;
      break;
    case 'sampleMultiplier':
      m.sample *= e.value;
      break;
    case 'autoStation':
      m.autoStation = true;
      break;
    case 'levyMultiplier':
      m.levy *= e.value;
      break;
  }
}

/** What the season's requisitions add up to. */
export function effects(o: Outfit): Effects {
  const m: Effects = {
    pass: 1,
    autoPasses: 0,
    attraction: {},
    guard: 1,
    autoOpen: false,
    catch: 1,
    autoRange: false,
    research: 1,
    autoEnhance: false,
    sample: 1,
    autoStation: false,
    levy: 1,
  };
  for (const u of FATHOM_UPGRADES) if (o.upgrades.includes(u.id)) apply(m, u.effect);
  return m;
}

export function isUpgradeUnlocked(o: Outfit, id: string): boolean {
  const u = FATHOM_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.earned !== undefined && o.lifetimeCash < u.unlock.earned) return false;
  if (u.unlock.attraction && (o.attractions[u.unlock.attraction.id] ?? 0) < u.unlock.attraction.count) return false;
  return true;
}

export function availableUpgrades(o: Outfit) {
  return FATHOM_UPGRADES.filter((u) => !o.upgrades.includes(u.id) && isUpgradeUnlocked(o, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyUpgrade(o: Outfit, id: string): Outfit {
  const u = FATHOM_UPGRADES.find((x) => x.id === id);
  if (!u || o.upgrades.includes(id) || !isUpgradeUnlocked(o, id) || o.cash < u.cost) return o;
  return { ...o, cash: o.cash - u.cost, upgrades: [...o.upgrades, id] };
}
