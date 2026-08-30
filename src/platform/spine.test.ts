import { describe, expect, it } from 'vitest';
import type { PlatformEntitlementGrantRecord } from './contracts';
import type { PlatformStore } from './ports';
import { PlatformSpine } from './spine';

const now = new Date('2026-08-30T10:00:00.000Z');
const request = { sessionId: 'session-1', principalId: 'user-1', tenantId: 'tenant-1', workspaceId: 'workspace-1' };

function grant(overrides: Partial<PlatformEntitlementGrantRecord> = {}): PlatformEntitlementGrantRecord {
  return {
    id: 'grant-1',
    tenantId: 'tenant-1',
    workspaceId: null,
    featureKey: 'knowledge.edit',
    effect: 'allow',
    source: 'stripe',
    startsAt: '2026-08-01T00:00:00.000Z',
    endsAt: null,
    updatedAt: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

function store(overrides: Partial<PlatformStore> = {}): PlatformStore {
  return {
    evidenceState: 'observed',
    findSession: async () => ({
      id: 'session-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      expiresAt: '2026-08-30T11:00:00.000Z',
      revokedAt: null,
      loggedOutAt: null,
    }),
    findUser: async () => ({ id: 'user-1', email: 'owner@example.test', displayName: 'Owner', status: 'active' }),
    findTenant: async () => ({ id: 'tenant-1', name: 'Tenant', status: 'active' }),
    findTenantMembership: async () => ({ tenantId: 'tenant-1', userId: 'user-1', role: 'owner', status: 'active' }),
    findWorkspace: async () => ({ id: 'workspace-1', tenantId: 'tenant-1', name: 'Workspace', status: 'active' }),
    findWorkspaceMembership: async () => ({ tenantId: 'tenant-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'owner', status: 'active' }),
    listEntitlementGrants: async () => [grant()],
    ...overrides,
  };
}

function spine(overrides: Partial<PlatformStore> = {}) {
  return new PlatformSpine(store(overrides), { now: () => now });
}

describe('PlatformSpine source contract', () => {
  it('returns observed facts without granting Base authority', async () => {
    const result = await spine().readAccessFacts(request);
    expect(result).toEqual({
      status: 'eligible',
      evidenceState: 'observed',
      principalId: 'user-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      entitlements: [{ featureKey: 'knowledge.edit', enabled: true, scope: 'tenant', source: 'stripe', evidenceState: 'observed' }],
    });
  });

  it('prefers workspace scope and deny at equal specificity', async () => {
    const result = await spine({
      listEntitlementGrants: async () => [
        grant(),
        grant({ id: 'workspace-allow', workspaceId: 'workspace-1', updatedAt: '2026-08-29T01:00:00.000Z' }),
        grant({ id: 'workspace-deny', workspaceId: 'workspace-1', effect: 'deny', updatedAt: '2026-08-20T00:00:00.000Z' }),
      ],
    }).readAccessFacts(request);
    expect(result.status).toBe('eligible');
    if (result.status === 'eligible') expect(result.entitlements[0]).toMatchObject({ enabled: false, scope: 'workspace' });
  });

  it('fails closed before reads when evidence is not observed', async () => {
    const result = await spine({ evidenceState: 'configured-unverified' }).readAccessFacts(request);
    expect(result).toEqual({ status: 'ineligible', evidenceState: 'configured-unverified', reason: 'evidence-not-observed', entitlements: [] });
  });

  it('fails closed for missing, expired, revoked and logged-out sessions', async () => {
    const missing = await spine({ findSession: async () => null }).readAccessFacts(request);
    const expired = await spine({ findSession: async () => ({ id: 'session-1', userId: 'user-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', expiresAt: now.toISOString(), revokedAt: null, loggedOutAt: null }) }).readAccessFacts(request);
    const revoked = await spine({ findSession: async () => ({ id: 'session-1', userId: 'user-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', expiresAt: '2026-08-30T11:00:00.000Z', revokedAt: '2026-08-30T09:00:00.000Z', loggedOutAt: null }) }).readAccessFacts(request);
    const loggedOut = await spine({ findSession: async () => ({ id: 'session-1', userId: 'user-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', expiresAt: '2026-08-30T11:00:00.000Z', revokedAt: null, loggedOutAt: '2026-08-30T09:00:00.000Z' }) }).readAccessFacts(request);
    expect([missing, expired, revoked, loggedOut].map(result => result.status === 'ineligible' ? result.reason : null)).toEqual([
      'session-missing',
      'session-expired',
      'session-revoked',
      'session-logged-out',
    ]);
  });

  it('rejects cross-scope session facts and suspended memberships', async () => {
    const wrongWorkspace = await spine({ findSession: async () => ({ id: 'session-1', userId: 'user-1', tenantId: 'tenant-1', workspaceId: 'other', expiresAt: '2026-08-30T11:00:00.000Z', revokedAt: null, loggedOutAt: null }) }).readAccessFacts(request);
    const suspended = await spine({ findTenantMembership: async () => ({ tenantId: 'tenant-1', userId: 'user-1', role: 'owner', status: 'suspended' }) }).readAccessFacts(request);
    expect(wrongWorkspace).toMatchObject({ status: 'ineligible', reason: 'session-workspace-mismatch' });
    expect(suspended).toMatchObject({ status: 'ineligible', reason: 'tenant-membership-missing' });
  });

  it('rejects an adapter record that does not match its lookup key', async () => {
    const result = await spine({ findWorkspace: async () => ({ id: 'other', tenantId: 'tenant-1', name: 'Wrong', status: 'active' }) }).readAccessFacts(request);
    expect(result).toEqual({ status: 'ineligible', evidenceState: 'unavailable', reason: 'access-facts-incoherent', entitlements: [] });
  });

  it('rejects malformed entitlement timestamps and redacts provider failures', async () => {
    const malformed = await spine({ listEntitlementGrants: async () => [grant({ startsAt: 'not-a-date' })] }).readAccessFacts(request);
    const providerFailure = await spine({ findSession: async () => { throw new Error('private provider detail'); } }).readAccessFacts(request);
    expect(malformed).toEqual({ status: 'ineligible', evidenceState: 'observed', reason: 'entitlement-data-invalid', entitlements: [] });
    expect(providerFailure).toEqual({ status: 'ineligible', evidenceState: 'unavailable', reason: 'access-facts-unavailable', entitlements: [] });
  });
});
