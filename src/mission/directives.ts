import { formatDuration, formatNumber } from '../shared/format';
import { appendLog } from './log';
import type { MissionState } from './state';
import type { ScenarioDef } from './kinds';
import { scenarioOf } from './registry';

export interface DirectiveGoal {
  /** 'credits' is common to every scenario; anything else is asked of the scenario's metric(). */
  metric: string;
  target: number;
  /** 'since': counts from issue time (extract X more). 'level': the counter itself (own N of something). */
  mode: 'since' | 'level';
}

export interface DirectiveDef {
  id: string;
  title: string;
  brief: string;
  /** Light-lag flavour: how long ago HQ sent it. */
  lag: string;
  /** Lifetime credits before it can be issued. */
  unlockCredits: number;
  /** The act the contract must have reached first: the darker orders wait for the discovery. */
  minAct?: number;
  goal: DirectiveGoal;
  /** Seconds allowed. */
  duration: number;
  reward: number;
}

/** Seconds between one directive resolving and the next being issued. */
export const DIRECTIVE_COOLDOWN = 90;

export interface ActiveDirective {
  id: string;
  issuedAt: number;
  /** Value of the tracked counter at issue time, for "since issue" goals. */
  baseline: number;
}

export type DirectiveResult = 'completed' | 'failed';

export function directiveDef(id: string, scenario: ScenarioDef): DirectiveDef | undefined {
  return scenario.directives.find((d) => d.id === id);
}

function counter(m: MissionState, def: DirectiveDef, scenario: ScenarioDef): number {
  return def.goal.metric === 'credits' ? m.lifetimeCredits : scenario.metric(m, def.goal.metric);
}

export function directiveProgress(m: MissionState, scenario: ScenarioDef = scenarioOf(m)): { current: number; target: number } {
  const def = m.directive && directiveDef(m.directive.id, scenario);
  if (!m.directive || !def) return { current: 0, target: 0 };
  const value = counter(m, def, scenario);
  const current = def.goal.mode === 'level' ? value : value - m.directive.baseline;
  return { current: Math.max(0, Math.min(current, def.goal.target)), target: def.goal.target };
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

export function tickDirectives(m: MissionState, scenario: ScenarioDef = scenarioOf(m)): MissionState {
  if (m.directive) {
    const def = directiveDef(m.directive.id, scenario);
    if (!def) return { ...m, directive: null };
    const { current, target } = directiveProgress(m, scenario);
    if (current >= target) return resolve(m, def, 'completed');
    if (m.elapsed - m.directive.issuedAt > def.duration) return resolve(m, def, 'failed');
    return m;
  }
  if (m.lastDirectiveAt !== null && m.elapsed - m.lastDirectiveAt < DIRECTIVE_COOLDOWN) return m;
  const next = scenario.directives.find((d) => !(d.id in m.directiveResults) && m.lifetimeCredits >= d.unlockCredits && m.act >= (d.minAct ?? 1));
  if (!next) return m;
  const issued: MissionState = { ...m, directive: { id: next.id, issuedAt: m.elapsed, baseline: counter(m, next, scenario) } };
  return appendLog(
    issued,
    'corp',
    `INCOMING [TX ${next.lag} AGO] DIRECTIVE ${next.id.toUpperCase()}: ${next.title}. ${next.brief} WINDOW: ${formatDuration(next.duration)}.`,
  );
}
