import type {
  PlatformAccessFacts,
  PlatformAccessFactsRequest,
  PlatformAccessIneligibility,
  PlatformEntitlementFact,
  PlatformEntitlementGrantRecord,
  PlatformEvidenceState,
} from './contracts';
import type { PlatformAccessFactsPort, PlatformClock, PlatformStore } from './ports';

const emptyEntitlements = [] as const;

function ineligible(evidenceState: PlatformEvidenceState, reason: PlatformAccessIneligibility): PlatformAccessFacts {
  return { status: 'ineligible', evidenceState, reason, entitlements: emptyEntitlements };
}

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function resolveEntitlements(
  records: readonly PlatformEntitlementGrantRecord[],
  request: PlatformAccessFactsRequest,
  now: number,
): readonly PlatformEntitlementFact[] | null {
  const active: PlatformEntitlementGrantRecord[] = [];

  for (const record of records) {
    if (record.tenantId !== request.tenantId) continue;
    if (record.workspaceId !== null && record.workspaceId !== request.workspaceId) continue;

    const startsAt = timestamp(record.startsAt);
    const endsAt = record.endsAt === null ? null : timestamp(record.endsAt);
    const updatedAt = timestamp(record.updatedAt);
    if (startsAt === null || updatedAt === null || (record.endsAt !== null && endsAt === null)) return null;
    if (endsAt !== null && endsAt <= startsAt) return null;
    if (startsAt > now || (endsAt !== null && endsAt <= now)) continue;
    active.push(record);
  }

  const selected = new Map<string, PlatformEntitlementGrantRecord>();
  for (const record of active) {
    const prior = selected.get(record.featureKey);
    if (!prior || entitlementPrecedes(record, prior)) selected.set(record.featureKey, record);
  }

  return [...selected.values()]
    .sort((left, right) => compareText(left.featureKey, right.featureKey))
    .map(record => ({
      featureKey: record.featureKey,
      enabled: record.effect === 'allow',
      scope: record.workspaceId === null ? 'tenant' : 'workspace',
      source: record.source,
      evidenceState: 'observed',
    }));
}

function entitlementPrecedes(candidate: PlatformEntitlementGrantRecord, current: PlatformEntitlementGrantRecord): boolean {
  const candidateScope = candidate.workspaceId === null ? 0 : 1;
  const currentScope = current.workspaceId === null ? 0 : 1;
  if (candidateScope !== currentScope) return candidateScope > currentScope;
  if (candidate.effect !== current.effect) return candidate.effect === 'deny';

  const candidateUpdatedAt = timestamp(candidate.updatedAt) ?? Number.NEGATIVE_INFINITY;
  const currentUpdatedAt = timestamp(current.updatedAt) ?? Number.NEGATIVE_INFINITY;
  if (candidateUpdatedAt !== currentUpdatedAt) return candidateUpdatedAt > currentUpdatedAt;
  return compareText(candidate.id, current.id) < 0;
}

/**
 * Resolves persistent eligibility facts for an already authenticated Base scope.
 * Eligibility is necessary data, never permission to issue or widen Base access.
 */
export class PlatformSpine implements PlatformAccessFactsPort {
  constructor(private readonly store: PlatformStore, private readonly clock: PlatformClock) {}

  async readAccessFacts(request: PlatformAccessFactsRequest): Promise<PlatformAccessFacts> {
    try {
      if ([request.sessionId, request.principalId, request.tenantId, request.workspaceId].some(value => typeof value !== 'string' || !value.trim())) {
        return ineligible('unavailable', 'access-facts-incoherent');
      }

      const evidenceState = this.store.evidenceState;
      if (evidenceState === 'unavailable') return ineligible('unavailable', 'access-facts-unavailable');
      if (evidenceState !== 'observed') return ineligible(evidenceState, 'evidence-not-observed');

      const now = this.clock.now().getTime();
      if (!Number.isFinite(now)) return ineligible('unavailable', 'access-facts-unavailable');

      const session = await this.store.findSession(request.sessionId);
      if (!session) return ineligible('observed', 'session-missing');
      if (session.id !== request.sessionId) return ineligible('unavailable', 'access-facts-incoherent');
      if (session.userId !== request.principalId) return ineligible('observed', 'session-principal-mismatch');
      if (session.tenantId !== request.tenantId) return ineligible('observed', 'session-tenant-mismatch');
      if (session.workspaceId !== request.workspaceId) return ineligible('observed', 'session-workspace-mismatch');
      if (session.loggedOutAt !== null) return ineligible('observed', 'session-logged-out');
      if (session.revokedAt !== null) return ineligible('observed', 'session-revoked');

      const expiresAt = timestamp(session.expiresAt);
      if (expiresAt === null || expiresAt <= now) return ineligible('observed', 'session-expired');

      const [user, tenant, tenantMembership, workspace, workspaceMembership, grants] = await Promise.all([
        this.store.findUser(request.principalId),
        this.store.findTenant(request.tenantId),
        this.store.findTenantMembership(request.tenantId, request.principalId),
        this.store.findWorkspace(request.tenantId, request.workspaceId),
        this.store.findWorkspaceMembership(request.tenantId, request.workspaceId, request.principalId),
        this.store.listEntitlementGrants(request.tenantId, request.workspaceId),
      ]);

      if (!user || user.status !== 'active') return ineligible('observed', 'user-inactive');
      if (user.id !== request.principalId) return ineligible('unavailable', 'access-facts-incoherent');
      if (!tenant || tenant.status !== 'active') return ineligible('observed', 'tenant-inactive');
      if (tenant.id !== request.tenantId) return ineligible('unavailable', 'access-facts-incoherent');
      if (!tenantMembership || tenantMembership.status !== 'active') return ineligible('observed', 'tenant-membership-missing');
      if (tenantMembership.tenantId !== request.tenantId || tenantMembership.userId !== request.principalId) {
        return ineligible('unavailable', 'access-facts-incoherent');
      }
      if (!workspace || workspace.status !== 'active') return ineligible('observed', 'workspace-inactive');
      if (workspace.id !== request.workspaceId || workspace.tenantId !== request.tenantId) {
        return ineligible('unavailable', 'access-facts-incoherent');
      }
      if (!workspaceMembership || workspaceMembership.status !== 'active') return ineligible('observed', 'workspace-membership-missing');
      if (
        workspaceMembership.tenantId !== request.tenantId
        || workspaceMembership.workspaceId !== request.workspaceId
        || workspaceMembership.userId !== request.principalId
      ) {
        return ineligible('unavailable', 'access-facts-incoherent');
      }

      const entitlements = resolveEntitlements(grants, request, now);
      if (!entitlements) return ineligible('observed', 'entitlement-data-invalid');

      return {
        status: 'eligible',
        evidenceState: 'observed',
        principalId: request.principalId,
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        entitlements,
      };
    } catch {
      return ineligible('unavailable', 'access-facts-unavailable');
    }
  }
}
