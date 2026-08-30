import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App, recipe } from './app';
import { DefaultShell, isRouteActive, readShellCollapsedPreference, SHELL_STORAGE_KEY, SwappableShell } from './shell';
import type { ProductRecipe, ShellProps } from './host';

const mounted: Array<{ root: Root; container: HTMLDivElement }> = [];
let fallbackStorage: Storage | undefined;

function testStorage(): Storage {
  try {
    const available = window.localStorage;
    if (available) return available;
  } catch {
    // Use the in-memory test seam below for opaque or restricted origins.
  }
  if (!fallbackStorage) {
    const values = new Map<string, string>();
    fallbackStorage = {
      get length() { return values.size; },
      clear() { values.clear(); },
      getItem(key) { return values.get(key) ?? null; },
      key(index) { return [...values.keys()][index] ?? null; },
      removeItem(key) { values.delete(key); },
      setItem(key, value) { values.set(key, String(value)); },
    } as Storage;
  }
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: fallbackStorage });
  } catch {
    // The helper still provides a usable isolated store for the assertions.
  }
  return fallbackStorage;
}

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  try {
    testStorage().removeItem(SHELL_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in a restricted browser context.
  }
});

async function mountShell(props: ShellProps) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => {
    root.render(<DefaultShell {...props} />);
  });
  return container;
}

function alternateRecipe(): ProductRecipe {
  return {
    id: 'atlas',
    name: 'Atlas',
    subtitle: 'Knowledge studio',
    theme: { mode: 'light' },
    navigation: [
      { id: 'library', label: 'Library', items: [{ id: 'start', label: 'Start', route: '/', icon: 'home' }] },
      { id: 'build', label: 'Build', items: [{ id: 'notes', label: 'Notes', route: '/notes', icon: 'layers' }] },
    ],
    settings: { id: 'preferences', label: 'Preferences', route: '/preferences', icon: 'settings' },
  };
}

describe('replaceable shell boundary', () => {
  it('renders an alternate shell without changing block mount contracts', () => {
    const Alternate = ({ children }: ShellProps) => <div data-verify="alternate-shell">{children}</div>;
    const html = renderToStaticMarkup(<SwappableShell recipe={recipe} active="/fixture" onNavigate={() => undefined} Shell={Alternate}>block</SwappableShell>);
    expect(html).toContain('data-verify="alternate-shell"');
    expect(html).toContain('block');
  });

  it('passes the host content mount through App when the shell is replaced', () => {
    const originalPath = location.pathname;
    history.replaceState({}, '', '/w/knowledge-local-workspace/fixture');
    const Alternate = ({ children }: ShellProps) => <div data-verify="app-alternate-shell">{children}</div>;
    const html = renderToStaticMarkup(<App Shell={Alternate} />);
    history.replaceState({}, '', originalPath);
    expect(html).toContain('data-verify="app-alternate-shell"');
    expect(html).toContain('data-verify="block-mount"');
  });

  it('lets a recipe replace product identity, groups, order, settings, and theme', () => {
    const selected = alternateRecipe();
    const html = renderToStaticMarkup(<DefaultShell recipe={selected} active="/notes" onNavigate={() => undefined}>mounted block</DefaultShell>);
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('Atlas');
    expect(html).toContain('Knowledge studio');
    expect(html).toContain('Library');
    expect(html).toContain('Build');
    expect(html).toContain('Preferences');
    expect(html.indexOf('Library')).toBeLessThan(html.indexOf('Build'));
    expect(html).toContain('data-verify="nav-notes"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('mounted block');
  });

  it('marks nested routes active without making the root route a prefix match', () => {
    expect(isRouteActive('/knowledge/document-1', '/knowledge')).toBe(true);
    expect(isRouteActive('/knowledge', '/knowledge')).toBe(true);
    expect(isRouteActive('/knowledgeable', '/knowledge')).toBe(false);
    expect(isRouteActive('/anything', '/')).toBe(false);
  });
});

describe('grouped rail states and accessibility', () => {
  it('preserves every recipe destination as an icon in compact mode', () => {
    testStorage().setItem(SHELL_STORAGE_KEY, 'true');
    const html = renderToStaticMarkup(<DefaultShell recipe={recipe} active="/fixture" onNavigate={() => undefined}>content</DefaultShell>);
    expect(html).toContain('data-rail-state="compact"');
    expect(html).toContain('data-verify-compact-destinations="6"');
    expect(html).not.toContain('shell-rail__nav-group');
    expect(html).toContain('aria-label="Fixture block"');
    expect(readShellCollapsedPreference()).toBe(true);
  });

  it('toggles compact state and persists only the rail preference', async () => {
    const container = await mountShell({ recipe, active: '/', onNavigate: () => undefined, children: 'content' });
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="Collapse rail"]');
    expect(toggle).toBeTruthy();
    await act(async () => toggle?.click());
    expect(container.querySelector('[data-verify="side-rail"]')?.getAttribute('data-rail-state')).toBe('compact');
    expect(testStorage().getItem(SHELL_STORAGE_KEY)).toBe('true');
    expect(testStorage().length).toBe(1);
  });

  it('exposes labeled navigation, a visible focus target, and mobile drawer semantics', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 760px)',
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList),
    });
    const container = await mountShell({ recipe, active: '/', onNavigate: () => undefined, children: 'content' });
    expect(container.querySelector('aside[aria-label="Product navigation"]')).toBeTruthy();
    expect(container.querySelector('nav[aria-label="Grouped page navigation"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Open navigation"]')).toBeTruthy();

    const open = container.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');
    await act(async () => open?.click());
    expect(container.querySelector('[data-verify="actionist-shell"]')?.getAttribute('data-mobile-drawer')).toBe('true');
    expect(container.querySelector('.shell-drawer-backdrop')).toBeTruthy();
    expect(container.querySelector('[data-verify="side-rail"]')?.hasAttribute('inert')).toBe(false);

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(container.querySelector('[data-verify="actionist-shell"]')?.getAttribute('data-mobile-drawer')).toBe('false');
    expect(container.querySelector('[data-verify="side-rail"]')?.hasAttribute('inert')).toBe(true);
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
  });
});
