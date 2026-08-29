import { describe, expect, it } from 'vitest';
import { assertOneOwner, conformanceChecks, evaluateSession, namespaceDescriptor, runLifecycle, type SessionAdapter } from './core';

const context = { tenantId: 't', workspaceId: 'w', principalId: 'p', correlationId: 'c' };

describe('internal block SDK candidate', () => {
  it('enforces one owner per namespace', () => {
    const owned = namespaceDescriptor({ name: 'knowledge', owner: 'affine', postgresSchema: 'knowledge' });
    expect(() => assertOneOwner([owned, { ...owned, owner: 'other' }])).toThrow('multiple owners');
    expect(() => assertOneOwner([owned, { ...owned }])).not.toThrow();
  });

  it('fails closed for wrong workspace, expiry, and missing capability', () => {
    expect(evaluateSession({ authenticated: false, workspaceId: 'w' }, context).status).toBe('unavailable');
    expect(evaluateSession({ authenticated: true, workspaceId: 'other' }, context).detail).toContain('mismatch');
    expect(evaluateSession({ authenticated: true, workspaceId: 'w', expiresAt: new Date(0).toISOString() }, context).detail).toContain('expired');
    expect(conformanceChecks({ authenticated: true, workspaceId: 'w', capabilities: ['view'] }, context, ['edit']).capabilities).toBe(false);
  });

  it('runs lifecycle in order and revokes once on cleanup', async () => {
    const order: string[] = [];
    const adapter: SessionAdapter<string> = {
      establish: async () => { order.push('establish'); return 'session'; },
      inspect: async () => { order.push('inspect'); return { authenticated: true, workspaceId: 'w' }; },
      revoke: async () => { order.push('revoke'); },
    };
    const cleanup = await runLifecycle({
      id: 'fixture',
      preload: async () => { order.push('preload'); },
      health: async () => { order.push('health'); return { status: 'healthy' }; },
      mount: async target => { order.push('mount'); target.textContent = 'mounted'; return () => { order.push('unmount'); }; },
    }, document.createElement('div'), context, adapter);
    expect(order).toEqual(['preload', 'establish', 'inspect', 'health', 'mount']);
    await cleanup();
    expect(order).toEqual(['preload', 'establish', 'inspect', 'health', 'mount', 'unmount', 'revoke']);
  });

  it('does not mount unavailable sessions and revokes them immediately', async () => {
    let mounted = false;
    let revoked = false;
    const adapter: SessionAdapter<string> = {
      establish: async () => 'session',
      inspect: async () => ({ authenticated: false, workspaceId: 'w' }),
      revoke: async () => { revoked = true; },
    };
    const cleanup = await runLifecycle({ id: 'fixture', mount: async () => { mounted = true; } }, document.createElement('div'), context, adapter);
    expect(mounted).toBe(false);
    expect(revoked).toBe(true);
    await cleanup();
  });

  it('refuses missing capabilities and revokes immediately', async () => {
    let mounted = false;
    let revoked = 0;
    const adapter: SessionAdapter<string> = {
      establish: async () => 'session',
      inspect: async () => ({ authenticated: true, workspaceId: 'w', capabilities: ['view'] }),
      revoke: async () => { revoked += 1; },
    };
    const cleanup = await runLifecycle({ id: 'fixture', mount: async () => { mounted = true; } }, document.createElement('div'), context, adapter, ['edit']);
    expect(mounted).toBe(false);
    expect(revoked).toBe(1);
    await cleanup();
    expect(revoked).toBe(1);
  });

  it('revokes even when unmount throws', async () => {
    let revoked = 0;
    const adapter: SessionAdapter<string> = {
      establish: async () => 'session',
      inspect: async () => ({ authenticated: true, workspaceId: 'w' }),
      revoke: async () => { revoked += 1; },
    };
    const cleanup = await runLifecycle({ id: 'fixture', mount: async () => () => { throw new Error('unmount failed'); } }, document.createElement('div'), context, adapter);
    await expect(cleanup()).rejects.toThrow('unmount failed');
    expect(revoked).toBe(1);
  });
});
