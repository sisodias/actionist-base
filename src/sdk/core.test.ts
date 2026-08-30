import { describe, expect, it } from 'vitest';
import { assertOneOwner, conformanceChecks, evaluateSession, namespaceDescriptor, runLifecycle, type SessionAdapter, type SessionState } from './core';

const context = { tenantId: 't', workspaceId: 'w', principalId: 'p', correlationId: 'c' };
const sessionContract = { issuer: 'actionist-base', audience: 'actionist/fixture', clientId: 'fixture-client' };
const activeState = (overrides: Partial<SessionState> = {}): SessionState => ({
  authenticated: true,
  issuer: sessionContract.issuer,
  audience: sessionContract.audience,
  clientId: sessionContract.clientId,
  principalId: context.principalId,
  tenantId: context.tenantId,
  workspaceId: context.workspaceId,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  capabilities: ['view', 'edit'],
  ...overrides,
});

describe('internal block SDK candidate', () => {
  it('enforces one owner per namespace', () => {
    const owned = namespaceDescriptor({ name: 'knowledge', owner: 'affine', postgresSchema: 'knowledge' });
    expect(() => assertOneOwner([owned, { ...owned, owner: 'other' }])).toThrow('multiple owners');
    expect(() => assertOneOwner([owned, { ...owned }])).not.toThrow();
  });

  it('fails closed for identity, scope, audience, client, expiry, and missing capability', () => {
    expect(evaluateSession({ authenticated: false, workspaceId: 'w' }, context).status).toBe('unavailable');
    expect(evaluateSession(activeState({ principalId: 'other' }), context, sessionContract).detail).toContain('principal');
    expect(evaluateSession(activeState({ tenantId: 'other' }), context, sessionContract).detail).toContain('tenant');
    expect(evaluateSession(activeState({ workspaceId: 'other' }), context, sessionContract).detail).toContain('workspace');
    expect(evaluateSession(activeState({ issuer: 'other' }), context, sessionContract).detail).toContain('issuer');
    expect(evaluateSession(activeState({ audience: 'other' }), context, sessionContract).detail).toContain('audience');
    expect(evaluateSession(activeState({ clientId: 'other' }), context, sessionContract).detail).toContain('client');
    expect(evaluateSession(activeState({ expiresAt: new Date(0).toISOString() }), context, sessionContract).detail).toContain('expired');
    expect(conformanceChecks(activeState({ capabilities: ['view'] }), context, ['edit'], sessionContract).capabilities).toBe(false);
  });

  it('runs lifecycle in order and revokes once on cleanup', async () => {
    const order: string[] = [];
    const adapter: SessionAdapter<string> = {
      establish: async () => { order.push('establish'); return 'session'; },
      inspect: async () => { order.push('inspect'); return activeState(); },
      revoke: async () => { order.push('revoke'); },
    };
    const target = document.createElement('div');
    const cleanup = await runLifecycle({
      id: 'fixture',
      sessionContract,
      preload: async () => { order.push('preload'); },
      health: async () => { order.push('health'); return { status: 'healthy' }; },
      mount: async target => { order.push('mount'); target.innerHTML = '<span>mounted</span>'; return () => { order.push(`unmount:${target.childElementCount}`); }; },
    }, target, context, adapter);
    expect(order).toEqual(['preload', 'establish', 'inspect', 'health', 'mount']);
    await cleanup();
    expect(order).toEqual(['preload', 'establish', 'inspect', 'health', 'mount', 'unmount:1', 'revoke']);
    expect(target.childElementCount).toBe(0);
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
      inspect: async () => activeState({ capabilities: ['view'] }),
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
      inspect: async () => activeState(),
      revoke: async () => { revoked += 1; },
    };
    const target = document.createElement('div');
    const cleanup = await runLifecycle({ id: 'fixture', mount: async target => { target.innerHTML = '<span>mounted</span>'; return () => { throw new Error('unmount failed'); }; } }, target, context, adapter);
    await expect(cleanup()).rejects.toThrow('unmount failed');
    expect(revoked).toBe(1);
    expect(target.childElementCount).toBe(0);
  });
});
