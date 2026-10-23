// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { mountAbout, REPOSITORY, TIP_JAR } from '../../src/picker/about';
import { mountPicker } from '../../src/picker/picker';
import { TELEMETRY_EVENT, type TelemetryEvent } from '../../src/shared/telemetry';

const mount = () => {
  document.body.innerHTML = '<div id="app"></div>';
  mountAbout(document.getElementById('app')!);
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the About page', () => {
  it('says who made the games, and puts thirty years of writing software and building them with Claude in the same sentence', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/about/i);
    expect(screen.getByText(/David Raynes/)).toBeTruthy();
    const trust = screen.getByText(/30 years/);
    expect(trust.textContent).toMatch(/Claude/);
  });

  it('says what the games do with the player\'s data: nothing leaves the device but optional anonymous play data', () => {
    mount();
    expect(screen.getByText(/save on this device/i)).toBeTruthy();
    expect(screen.getByText(/anonymous play data/i)).toBeTruthy();
  });

  it('offers the Ko-fi tip jar in a new tab, and says a tip unlocks nothing', () => {
    mount();
    const tip = screen.getByRole('link', { name: /tip jar/i }) as HTMLAnchorElement;
    expect(tip.href).toBe(TIP_JAR);
    expect(TIP_JAR).toBe('https://ko-fi.com/rayners');
    expect(tip.target).toBe('_blank');
    expect(tip.rel).toMatch(/noopener/);
    expect(screen.getByText(/unlock nothing|unlocks nothing/i)).toBeTruthy();
  });

  it('announces the tip jar being opened, for telemetry', async () => {
    const heard: TelemetryEvent[] = [];
    const listen = (e: Event) => heard.push((e as CustomEvent<TelemetryEvent>).detail);
    document.addEventListener(TELEMETRY_EVENT, listen);
    mount();
    const tip = screen.getByRole('link', { name: /tip jar/i });
    tip.addEventListener('click', (e) => e.preventDefault());
    await userEvent.setup().click(tip);
    expect(heard).toContainEqual({ name: 'tip_jar_opened', props: { from: 'about' } });
    document.removeEventListener(TELEMETRY_EVENT, listen);
  });

  it('links to the source code on GitHub', () => {
    mount();
    expect(REPOSITORY).toBe('https://github.com/rayners/clicker');
    expect((screen.getByRole('link', { name: /source code/i }) as HTMLAnchorElement).href).toBe(REPOSITORY);
  });

  it('leads back to the games', () => {
    mount();
    expect((screen.getByRole('link', { name: /back to the games/i }) as HTMLAnchorElement).getAttribute('href')).toBe('../');
  });

  it('is linked from the picker\'s footer', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountPicker(document.getElementById('app')!, localStorage);
    expect((screen.getByRole('link', { name: /about.*tip jar/i }) as HTMLAnchorElement).getAttribute('href')).toBe('./about/');
  });
});
