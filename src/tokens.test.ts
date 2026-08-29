import { describe, expect, it } from 'vitest';
import { HOST_TOKEN_MAP, resolveThemeMode, resolveTokenStyle, TOKEN_CATEGORIES } from './tokens';

describe('semantic host token foundation', () => {
  it('exposes every required category through product-neutral custom properties', () => {
    for (const names of Object.values(TOKEN_CATEGORIES)) {
      for (const name of names) {
        expect(HOST_TOKEN_MAP[name]).toMatch(/^--actionist-/);
      }
    }
    expect(Object.keys(HOST_TOKEN_MAP).join(' ')).not.toMatch(/crm|siso|block/i);
  });

  it('maps only typed recipe overrides into host CSS variables', () => {
    const style = resolveTokenStyle({
      mode: 'light',
      overrides: {
        actionPrimary: '#0057b8',
        radiusCard: '20px',
      },
    });
    expect(style).toEqual({
      '--actionist-action-primary': '#0057b8',
      '--actionist-radius-card': '20px',
    });
  });

  it('is dark by default and supports light/system-ready recipe modes', () => {
    expect(resolveThemeMode()).toBe('dark');
    expect(resolveThemeMode({ mode: 'light' })).toBe('light');
    expect(resolveThemeMode({ mode: 'system' })).toBe('system');
  });
});
