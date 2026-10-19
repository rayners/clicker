import { UPGRADES, type UpgradeDef } from '../../data/extraction/upgrades';
import type { MissionState } from '../state';

export function isUpgradeUnlocked(m: MissionState, u: UpgradeDef): boolean {
  const { lifetimeOre, generator } = u.unlock;
  if (lifetimeOre !== undefined && m.lifetimeOre < lifetimeOre) return false;
  if (generator && (m.generators[generator.id] ?? 0) < generator.count) return false;
  return true;
}

export function availableUpgrades(m: MissionState): UpgradeDef[] {
  return UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isUpgradeUnlocked(m, u)).sort((a, b) => a.cost - b.cost);
}

export function buyUpgrade(m: MissionState, id: string): MissionState {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isUpgradeUnlocked(m, u) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}
