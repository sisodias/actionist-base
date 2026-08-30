import type { AuthenticatedHostPrincipal } from '../auth/host-auth';
import type {
  HostAccessGrant,
  HostAccessPort,
  HostAccessReadback,
  HostAccessRequest,
  HostAssertionClaims,
  HostContext,
  HostRevocationReadback,
  HostSessionReadback,
} from '../host';
import type { TenantWorkspaceSelection } from '../tenancy/workspace-selection';

export type HostSessionStatus = 'missing' | 'active' | 'expired' | 'revoked' | 'logged_out';

export type HostSessionErrorCode =
  | 'SESSION_MISSING'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'SESSION_LOGGED_OUT'
  | 'SCOPE_DENIED'
  | 'AUDIENCE_DENIED'
  | 'CLIENT_DENIED'
  | 'CAPABILITY_DENIED'
  | 'ASSERTION_ISSUE_FAILED'
  | 'ASSERTION_REVOKE_FAILED'
  | 'ACCESS_REPLAY_DENIED';

export class HostSessionError extends Error {
  constructor(readonly code: HostSessionErrorCode, message: string) {
    super(message);
    this.name = 'HostSessionError';
  }
}

export type HostAudiencePolicy = {
  audience: string;
  clientId: string;
  capabilities: readonly string[];
  accessTtlMs?: number;
};

export type HostAssertionIssuer = (claims: HostAssertionClaims) => Promise<string>;
export type HostAssertionRevoker = (readback: HostAccessReadback) => Promise<void>;

export type BaseSessionAuthorityOptions = {
  issuer: string;
  policies: readonly HostAudiencePolicy[];
  issueAssertion: HostAssertionIssuer;
  revokeAssertion: HostAssertionRevoker;
  now?: () => number;
  createSessionId?: () => string;
  createAccessId?: () => string;
  sessionTtlMs?: number;
};

type SessionRecord = {
  sessionId: string;
  status: Exclude<HostSessionStatus, 'missing'>;
  principal: AuthenticatedHostPrincipal;
  selection: TenantWorkspaceSelection;
  capabilities: readonly string[];
  issuedAt: string;
  expiresAt: string;
};

type AccessRecord = {
  readback: HostAccessReadback;
  status: 'active' | 'revoked';
  revokedAt: string | null;
};

const DEFAULT_SESSION_TTL_MS = 5 * 60_000;

export class BaseSessionAuthority {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly policies = new Map<string, HostAudiencePolicy>();
  private readonly accessIds = new Set<string>();
  private readonly accesses = new Map<string, AccessRecord>();
  private readonly now: () => number;
  private readonly createSessionId: () => string;
  private readonly createAccessId: () => string;
  private readonly sessionTtlMs: number;

  constructor(private readonly options: BaseSessionAuthorityOptions) {
    if (!options.issuer.trim()) throw new Error('host session issuer is required');
    if (typeof options.revokeAssertion !== 'function') throw new Error('host assertion revoker is required');
    this.now = options.now ?? Date.now;
    this.createSessionId = options.createSessionId ?? (() => globalThis.crypto.randomUUID());
    this.createAccessId = options.createAccessId ?? (() => globalThis.crypto.randomUUID());
    this.sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    if (!Number.isFinite(this.sessionTtlMs) || this.sessionTtlMs <= 0) throw new Error('host session ttl must be positive');
    for (const policy of options.policies) {
      const audience = policy.audience.trim();
      const clientId = policy.clientId.trim();
      if (!audience || !clientId) throw new Error('audience policy requires audience and client id');
      if (policy.accessTtlMs !== undefined && (!Number.isFinite(policy.accessTtlMs) || policy.accessTtlMs <= 0)) {
        throw new Error('audience policy access ttl must be positive');
      }
      if (this.policies.has(audience)) throw new Error(`duplicate audience policy: ${audience}`);
      this.policies.set(audience, {
        ...policy,
        audience,
        clientId,
        capabilities: normalizeCapabilities(policy.capabilities),
      });
    }
  }

  login(
    principal: AuthenticatedHostPrincipal,
    selection: TenantWorkspaceSelection,
    ttlMs = this.sessionTtlMs,
  ): HostSessionReadback {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('host session ttl must be positive');
    const issuedAtMs = this.now();
    const sessionId = this.createSessionId().trim();
    if (!sessionId || this.sessions.has(sessionId)) throw new Error('host session id must be unique and non-empty');
    const record: SessionRecord = {
      sessionId,
      status: 'active',
      principal: clonePrincipal(principal),
      selection: cloneSelection(selection),
      capabilities: normalizeCapabilities(selection.capabilities),
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
    };
    this.sessions.set(sessionId, record);
    return this.readback(record);
  }

  inspect(sessionId: string | null | undefined): HostSessionReadback {
    if (!sessionId) return missingReadback(this.options.issuer, sessionId ?? null);
    const record = this.sessions.get(sessionId);
    if (!record) return missingReadback(this.options.issuer, sessionId);
    this.expireIfNeeded(record);
    return this.readback(record);
  }

  accessPort(sessionId: string | null | undefined): HostAccessPort {
    return {
      inspect: async () => this.inspect(sessionId),
      issue: async (context, request) => {
        const record = this.requireActive(sessionId);
        if (
          record.principal.principalId !== context.principalId
          || record.principal.principalKind !== context.principalKind
          || record.selection.tenantId !== context.tenantId
          || record.selection.workspaceId !== context.workspaceId
        ) {
          throw new HostSessionError('SCOPE_DENIED', 'Base access context denied');
        }
        return this.issueAccess(sessionId, request, context.correlationId);
      },
      revoke: async (context, accessId) => this.revokeAccess(sessionId, accessId, context),
    };
  }

  async issueAccess(
    sessionId: string | null | undefined,
    request: HostAccessRequest,
    correlationId: string,
  ): Promise<HostAccessGrant> {
    const record = this.requireActive(sessionId);
    const policy = this.policies.get(request.audience);
    if (!policy) throw new HostSessionError('AUDIENCE_DENIED', 'Base audience denied');
    if (request.clientId !== policy.clientId) throw new HostSessionError('CLIENT_DENIED', 'Base client denied');
    const requestedCapabilities = normalizeCapabilities(request.requiredCapabilities);
    const sessionCapabilities = new Set(record.capabilities);
    const policyCapabilities = new Set(policy.capabilities);
    if (!requestedCapabilities.every((capability) => sessionCapabilities.has(capability) && policyCapabilities.has(capability))) {
      throw new HostSessionError('CAPABILITY_DENIED', 'Base capability denied');
    }
    const normalizedCorrelationId = correlationId.trim();
    if (!normalizedCorrelationId) throw new HostSessionError('SCOPE_DENIED', 'Base access correlation denied');
    const accessId = this.createAccessId().trim();
    if (!accessId || this.accessIds.has(accessId)) throw new Error('host access id must be unique and non-empty');
    this.accessIds.add(accessId);

    const issuedAtMs = this.now();
    const sessionExpiryMs = Date.parse(record.expiresAt);
    const policyExpiryMs = policy.accessTtlMs ? issuedAtMs + policy.accessTtlMs : sessionExpiryMs;
    const expiresAt = new Date(Math.min(sessionExpiryMs, policyExpiryMs)).toISOString();
    const claims: HostAssertionClaims = {
      issuer: this.options.issuer,
      audience: policy.audience,
      clientId: policy.clientId,
      sessionId: record.sessionId,
      accessId,
      principalId: record.principal.principalId,
      principalKind: record.principal.principalKind,
      tenantId: record.selection.tenantId,
      workspaceId: record.selection.workspaceId,
      capabilities: requestedCapabilities,
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt,
      correlationId: normalizedCorrelationId,
    };
    let assertion: string;
    try {
      assertion = await this.options.issueAssertion(claims);
    } catch {
      this.accessIds.delete(accessId);
      throw new HostSessionError('ASSERTION_ISSUE_FAILED', 'Base assertion issue failed');
    }
    if (!assertion.trim()) {
      this.accessIds.delete(accessId);
      throw new HostSessionError('ASSERTION_ISSUE_FAILED', 'Base assertion issue failed');
    }
    const readback: HostAccessReadback = {
      ...claims,
      authenticated: true,
      assertionPresent: true,
    };
    try {
      this.requireActive(sessionId);
    } catch (error) {
      const revokedAt = new Date(this.now()).toISOString();
      try {
        await this.options.revokeAssertion({ ...readback, capabilities: [...readback.capabilities] });
      } catch {
        this.accesses.set(accessId, { readback, status: 'active', revokedAt: null });
        throw new HostSessionError('ASSERTION_REVOKE_FAILED', 'Base assertion revoke failed');
      }
      this.accesses.set(accessId, { readback, status: 'revoked', revokedAt });
      throw error;
    }
    this.accesses.set(accessId, { readback, status: 'active', revokedAt: null });
    return { assertion, readback };
  }

  async revokeAccess(
    sessionId: string | null | undefined,
    accessId: string,
    context: HostContext,
  ): Promise<HostRevocationReadback> {
    const normalizedAccessId = accessId.trim();
    const access = this.accesses.get(normalizedAccessId);
    if (!access || access.readback.sessionId !== sessionId) {
      throw new HostSessionError('ACCESS_REPLAY_DENIED', 'Base access replay denied');
    }
    if (
      access.readback.principalId !== context.principalId
      || access.readback.principalKind !== context.principalKind
      || access.readback.tenantId !== context.tenantId
      || access.readback.workspaceId !== context.workspaceId
      || access.readback.correlationId !== context.correlationId
    ) {
      throw new HostSessionError('ACCESS_REPLAY_DENIED', 'Base access replay denied');
    }
    const session = this.sessions.get(access.readback.sessionId);
    if (!session) throw new HostSessionError('SESSION_MISSING', 'Base session missing');
    this.expireIfNeeded(session);
    const priorStatus = session.status;
    const revokedAt = new Date(this.now()).toISOString();
    await this.revokeAccessRecords([access], revokedAt);
    return this.revocationReadback(session, [normalizedAccessId], priorStatus, revokedAt, context.correlationId);
  }

  async revoke(sessionId: string | null | undefined, correlationId: string): Promise<HostRevocationReadback> {
    return this.closeSession(sessionId, 'revoked', correlationId);
  }

  async logout(sessionId: string | null | undefined, correlationId: string): Promise<HostRevocationReadback> {
    return this.closeSession(sessionId, 'logged_out', correlationId);
  }

  private requireActive(sessionId: string | null | undefined): SessionRecord {
    const readback = this.inspect(sessionId);
    if (readback.status === 'missing') throw new HostSessionError('SESSION_MISSING', 'Base session missing');
    if (readback.status === 'expired') throw new HostSessionError('SESSION_EXPIRED', 'Base session expired');
    if (readback.status === 'revoked') throw new HostSessionError('SESSION_REVOKED', 'Base session revoked');
    if (readback.status === 'logged_out') throw new HostSessionError('SESSION_LOGGED_OUT', 'Base session logged out');
    return this.sessions.get(readback.sessionId!)!;
  }

  private expireIfNeeded(record: SessionRecord): void {
    if (record.status === 'active' && Date.parse(record.expiresAt) <= this.now()) record.status = 'expired';
  }

  private async closeSession(
    sessionId: string | null | undefined,
    status: 'revoked' | 'logged_out',
    correlationId: string,
  ): Promise<HostRevocationReadback> {
    const normalizedCorrelationId = correlationId.trim();
    if (!normalizedCorrelationId) throw new HostSessionError('SCOPE_DENIED', 'Base revocation correlation denied');
    if (!sessionId) throw new HostSessionError('SESSION_MISSING', 'Base session missing');
    const session = this.sessions.get(sessionId);
    if (!session) throw new HostSessionError('SESSION_MISSING', 'Base session missing');
    this.expireIfNeeded(session);
    const priorStatus = session.status;
    if (status === 'logged_out' || session.status !== 'logged_out') session.status = status;
    const accesses = [...this.accesses.values()].filter((access) => access.readback.sessionId === sessionId);
    const revokedAt = new Date(this.now()).toISOString();
    await this.revokeAccessRecords(accesses, revokedAt);
    return this.revocationReadback(
      session,
      accesses.map((access) => access.readback.accessId).sort(),
      priorStatus,
      revokedAt,
      normalizedCorrelationId,
    );
  }

  private async revokeAccessRecords(accesses: readonly AccessRecord[], revokedAt: string): Promise<void> {
    for (const access of accesses) {
      if (access.status === 'revoked') continue;
      try {
        await this.options.revokeAssertion({ ...access.readback, capabilities: [...access.readback.capabilities] });
      } catch {
        throw new HostSessionError('ASSERTION_REVOKE_FAILED', 'Base assertion revoke failed');
      }
      access.status = 'revoked';
      access.revokedAt = revokedAt;
    }
  }

  private revocationReadback(
    session: SessionRecord,
    accessIds: readonly string[],
    priorStatus: HostSessionStatus,
    revokedAt: string,
    correlationId: string,
  ): HostRevocationReadback {
    return {
      ok: true,
      sessionId: session.sessionId,
      accessIds: [...accessIds],
      priorStatus,
      currentStatus: session.status,
      revokedAt,
      externalRevocationComplete: true,
      correlationId,
    };
  }

  private readback(record: SessionRecord): HostSessionReadback {
    return {
      status: record.status,
      authenticated: record.status === 'active',
      issuer: this.options.issuer,
      sessionId: record.sessionId,
      principalId: record.principal.principalId,
      principalKind: record.principal.principalKind,
      tenantId: record.selection.tenantId,
      workspaceId: record.selection.workspaceId,
      capabilities: [...record.capabilities],
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
    };
  }
}

function missingReadback(issuer: string, sessionId: string | null): HostSessionReadback {
  return {
    status: 'missing',
    authenticated: false,
    issuer,
    sessionId,
    principalId: null,
    principalKind: null,
    tenantId: null,
    workspaceId: null,
    capabilities: [],
    issuedAt: null,
    expiresAt: null,
  };
}

function normalizeCapabilities(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map((capability) => capability.trim()).filter(Boolean))].sort();
}

function clonePrincipal(principal: AuthenticatedHostPrincipal): AuthenticatedHostPrincipal {
  return {
    ...principal,
    teamIds: [...principal.teamIds],
    clientAccountIds: [...principal.clientAccountIds],
  };
}

function cloneSelection(selection: TenantWorkspaceSelection): TenantWorkspaceSelection {
  return { ...selection, capabilities: [...selection.capabilities] };
}
