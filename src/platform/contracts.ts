export type PlatformEvidenceState = 'fixture' | 'configured-unverified' | 'observed' | 'unavailable';

export type PlatformRecordStatus = 'active' | 'disabled';
export type PlatformMembershipStatus = 'active' | 'suspended';
export type PlatformEntitlementEffect = 'allow' | 'deny';

export type PlatformAccessIneligibility =
  | 'evidence-not-observed'
  | 'access-facts-unavailable'
  | 'access-facts-incoherent'
  | 'session-missing'
  | 'session-principal-mismatch'
  | 'session-tenant-mismatch'
  | 'session-workspace-mismatch'
  | 'session-expired'
  | 'session-revoked'
  | 'session-logged-out'
  | 'user-inactive'
  | 'tenant-inactive'
  | 'tenant-membership-missing'
  | 'workspace-inactive'
  | 'workspace-membership-missing'
  | 'entitlement-data-invalid';

export type PlatformAccessFactsRequest = {
  sessionId: string;
  principalId: string;
  tenantId: string;
  workspaceId: string;
};

export type PlatformEntitlementFact = {
  featureKey: string;
  enabled: boolean;
  scope: 'tenant' | 'workspace';
  source: string;
  evidenceState: PlatformEvidenceState;
};

export type PlatformAccessFacts =
  | {
      status: 'eligible';
      evidenceState: 'observed';
      principalId: string;
      tenantId: string;
      workspaceId: string;
      entitlements: readonly PlatformEntitlementFact[];
    }
  | {
      status: 'ineligible';
      evidenceState: PlatformEvidenceState;
      reason: PlatformAccessIneligibility;
      entitlements: readonly [];
    };

export type PlatformUserRecord = {
  id: string;
  email: string;
  displayName: string | null;
  status: PlatformRecordStatus;
};

export type PlatformTenantRecord = {
  id: string;
  name: string;
  status: PlatformRecordStatus;
};

export type PlatformTenantMembershipRecord = {
  tenantId: string;
  userId: string;
  role: string;
  status: PlatformMembershipStatus;
};

export type PlatformWorkspaceRecord = {
  id: string;
  tenantId: string;
  name: string;
  status: PlatformRecordStatus;
};

export type PlatformWorkspaceMembershipRecord = {
  tenantId: string;
  workspaceId: string;
  userId: string;
  role: string;
  status: PlatformMembershipStatus;
};

export type PlatformSessionRecord = {
  id: string;
  userId: string;
  tenantId: string;
  workspaceId: string;
  expiresAt: string;
  revokedAt: string | null;
  loggedOutAt: string | null;
};

export type PlatformEntitlementGrantRecord = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  featureKey: string;
  effect: PlatformEntitlementEffect;
  source: string;
  startsAt: string;
  endsAt: string | null;
  updatedAt: string;
};

export type PlatformAccountReadModel = {
  evidenceState: PlatformEvidenceState;
  id: string | null;
  email: string | null;
  displayName: string | null;
  status: PlatformRecordStatus | 'unavailable';
};

export type PlatformWorkspaceReadModel = {
  evidenceState: PlatformEvidenceState;
  id: string;
  tenantId: string;
  name: string;
  membershipRole: string;
  status: PlatformRecordStatus | 'unavailable';
};

export type PlatformBillingReadModel = {
  evidenceState: PlatformEvidenceState;
  tenantId: string;
  provider: string | null;
  providerAccountRef: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'unavailable';
};

export type PlatformEntitlementReadModel = PlatformEntitlementFact & {
  tenantId: string;
  workspaceId: string | null;
};

export type PlatformReadScope = {
  tenantId: string;
  workspaceId?: string;
};
