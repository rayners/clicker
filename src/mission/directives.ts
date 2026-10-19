import { formatDuration, formatNumber } from '../core/format';
import { DIRECTIVES, type DirectiveDef } from '../data/directives';
import { appendLog } from './log';
import type { MissionState } from './state';

/** Seconds between one directive resolving and the next being issued. */
export const DIRECTIVE_COOLDOWN = 90;

export interface ActiveDirective {
  id: string;
  issuedAt: number;
  /** Value of the tracked counter at issue time, for "since issue" goals. */
  baseline: number;
}

export type DirectiveResult = 'completed' | 'failed';

export function directiveDef(id: string): DirectiveDef | undefined {
  return DIRECTIVES.find((d) => d.id === id);
}

function counter(m: MissionState, def: DirectiveDef): number {
  switch (def.goal.kind) {
    case 'extractOre':
      return m.lifetimeOre;
    case 'earnCredits':
      return m.lifetimeCredits;
    case 'ownGenerators':
      return m.generators[def.goal.generator] ?? 0;
  }
}

export function directiveProgress(m: MissionState): { current: number; target: number } {
  const def = m.directive && directiveDef(m.directive.id);
  if (!m.directive || !def) return { current: 0, target: 0 };
  const value = counter(m, def);
  const current = def.goal.kind === 'ownGenerators' ? value : value - m.directive.baseline;
  return { current: Math.min(current, def.goal.target), target: def.goal.target };
}

function resolve(m: MissionState, def: DirectiveDef, result: DirectiveResult): MissionState {
  const resolved: MissionState = {
    ...m,
    directive: null,
    lastDirectiveAt: m.elapsed,
    directiveResults: { ...m.directiveResults, [def.id]: result },
    credits: result === 'completed' ? m.credits + def.reward : m.credits,
  };
  const text =
    result === 'completed'
      ? `DIRECTIVE ${def.id.toUpperCase()} COMPLETE. +${formatNumber(def.reward)} CR. THE COMBINE THANKS YOU.`
      : `DIRECTIVE ${def.id.toUpperCase()} LAPSED. PERFORMANCE NOTED.`;
  return appendLog(resolved, 'corp', text);
}

export function tickDirectives(m: MissionState): MissionState {
  if (m.directive) {
    const def = directiveDef(m.directive.id);
    if (!def) return { ...m, directive: null };
    const { current, target } = directiveProgress(m);
    if (current >= target) return resolve(m, def, 'completed');
    if (m.elapsed - m.directive.issuedAt > def.duration) return resolve(m, def, 'failed');
    return m;
  }
  if (m.lastDirectiveAt !== null && m.elapsed - m.lastDirectiveAt < DIRECTIVE_COOLDOWN) return m;
  const next = DIRECTIVES.find((d) => !(d.id in m.directiveResults) && m.lifetimeOre >= d.unlockOre);
  if (!next) return m;
  const issued: MissionState = { ...m, directive: { id: next.id, issuedAt: m.elapsed, baseline: counter(m, next) } };
  return appendLog(
    issued,
    'corp',
    `INCOMING [TX ${next.lag} AGO] DIRECTIVE ${next.id.toUpperCase()}: ${next.title}. ${next.brief} WINDOW: ${formatDuration(next.duration)}.`,
  );
}
