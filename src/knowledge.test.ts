import { describe, expect, it, vi } from 'vitest';
import { createKnowledgeBindings, fetchKnowledgeIdentity, installKnowledgeHostSession } from './knowledge';

const config = { moduleUrl: '/module.js', backendBase: '/backend', issuerUrl: '/issuer', expectedClientId: 'bykonz-yard' };
const identity = { userId: 'u', email: 'u@example.test', clientId: 'bykonz-yard', workspaceId: 'w', expiresAt: new Date(Date.now() + 60_000).toISOString(), capabilities: ['view', 'edit'] as const, token: 'signed-context' };

describe('knowledge runtime bridge', () => {
  it('fetches and validates the signed host identity', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(identity), { status: 200 })));
    await expect(fetchKnowledgeIdentity(config)).resolves.toMatchObject({ userId: 'u', token: 'signed-context' });
    expect(fetch).toHaveBeenCalledWith('/issuer/api/siso/knowledge-context', expect.objectContaining({ credentials: 'include' }));
    vi.unstubAllGlobals();
  });

  it('rejects client mismatch and expiry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...identity, clientId: 'other' }), { status: 200 })));
    await expect(fetchKnowledgeIdentity(config)).rejects.toThrow('client mismatch');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...identity, expiresAt: new Date(0).toISOString() }), { status: 200 })));
    await expect(fetchKnowledgeIdentity(config)).rejects.toThrow('expired');
    vi.unstubAllGlobals();
  });

  it('installs the disposable host session only when configured', () => {
    installKnowledgeHostSession({ ...config, hostSessionCookie: 'fixture-session' });
    expect(document.cookie).toContain('siso_host_session=fixture-session');
  });

  it('binds the signed context and knowledge-owned namespaces', async () => {
    const bindings = createKnowledgeBindings({ ...identity, capabilities: ['view', 'edit'] }, config);
    await expect(bindings.identity.issue('knowledge', {} as never)).resolves.toBe('signed-context');
    expect(bindings.data).toEqual({ postgresSchema: 'knowledge', redisNamespace: 'knowledge', objectNamespace: 'knowledge' });
    expect(bindings.tokens.resolve(['sisoRequestContext'])).toEqual({ sisoRequestContext: 'signed-context' });
  });
});
