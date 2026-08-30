import type {
  PlatformAccessFacts,
  PlatformAccessFactsRequest,
  PlatformAccountReadModel,
  PlatformBillingReadModel,
  PlatformEntitlementGrantRecord,
  PlatformEntitlementReadModel,
  PlatformEvidenceState,
  PlatformReadScope,
  PlatformSessionRecord,
  PlatformTenantMembershipRecord,
  PlatformTenantRecord,
  PlatformUserRecord,
  PlatformWorkspaceMembershipRecord,
  PlatformWorkspaceReadModel,
  PlatformWorkspaceRecord,
} from './contracts';

export interface PlatformAccessFactsPort {
  readAccessFacts(request: PlatformAccessFactsRequest): Promise<PlatformAccessFacts>;
}

export interface PlatformReadPort {
  readAccount(userId: string): Promise<PlatformAccountReadModel>;
  listWorkspaces(userId: string): Promise<readonly PlatformWorkspaceReadModel[]>;
  readBilling(tenantId: string): Promise<PlatformBillingReadModel>;
  readEntitlements(scope: PlatformReadScope): Promise<readonly PlatformEntitlementReadModel[]>;
}

export interface PlatformClock {
  now(): Date;
}

/** Provider-facing persistence seam. It is not a Base authority API. */
export interface PlatformStore {
  readonly evidenceState: PlatformEvidenceState;
  findSession(sessionId: string): Promise<PlatformSessionRecord | null>;
  findUser(userId: string): Promise<PlatformUserRecord | null>;
  findTenant(tenantId: string): Promise<PlatformTenantRecord | null>;
  findTenantMembership(tenantId: string, userId: string): Promise<PlatformTenantMembershipRecord | null>;
  findWorkspace(tenantId: string, workspaceId: string): Promise<PlatformWorkspaceRecord | null>;
  findWorkspaceMembership(tenantId: string, workspaceId: string, userId: string): Promise<PlatformWorkspaceMembershipRecord | null>;
  listEntitlementGrants(tenantId: string, workspaceId: string): Promise<readonly PlatformEntitlementGrantRecord[]>;
}
