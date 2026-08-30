export type TenantWorkspaceSelection = {
  tenantId: string;
  workspaceId: string;
  workspaceName: string;
  capabilities: readonly string[];
};

export type WorkspaceMembership = TenantWorkspaceSelection & {
  principalId: string;
};

export type TenancyErrorCode = 'SCOPE_INVALID' | 'WORKSPACE_DENIED';

export class TenancyError extends Error {
  constructor(readonly code: TenancyErrorCode, message: string) {
    super(message);
    this.name = 'TenancyError';
  }
}

export class HostTenancyDirectory {
  private readonly memberships: readonly WorkspaceMembership[];

  constructor(memberships: readonly WorkspaceMembership[]) {
    this.memberships = memberships.map((membership) => {
      assertOpaqueId(membership.principalId, 'principal');
      assertOpaqueId(membership.tenantId, 'tenant');
      assertOpaqueId(membership.workspaceId, 'workspace');
      if (!membership.workspaceName.trim()) throw new TenancyError('SCOPE_INVALID', 'workspace name is required');
      return { ...membership, capabilities: uniqueCapabilities(membership.capabilities) };
    });
  }

  list(principalId: string): TenantWorkspaceSelection[] {
    return this.memberships
      .filter((membership) => membership.principalId === principalId)
      .map(({ principalId: _principalId, ...selection }) => ({ ...selection, capabilities: [...selection.capabilities] }));
  }

  select(principalId: string, tenantId: string, workspaceId: string): TenantWorkspaceSelection {
    const membership = this.memberships.find((candidate) => (
      candidate.principalId === principalId
      && candidate.tenantId === tenantId
      && candidate.workspaceId === workspaceId
    ));
    if (!membership) throw new TenancyError('WORKSPACE_DENIED', 'Base workspace selection denied');
    const { principalId: _principalId, ...selection } = membership;
    return { ...selection, capabilities: [...selection.capabilities] };
  }
}

export function workspaceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/w\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  try {
    const workspaceId = decodeURIComponent(match[1]);
    assertOpaqueId(workspaceId, 'workspace');
    return workspaceId;
  } catch {
    return null;
  }
}

export function workspacePath(workspaceId: string, route = '/'): string {
  assertOpaqueId(workspaceId, 'workspace');
  if (!route.startsWith('/')) throw new TenancyError('SCOPE_INVALID', 'workspace route must start with /');
  return `/w/${encodeURIComponent(workspaceId)}${route === '/' ? '' : route}`;
}

function assertOpaqueId(value: string, label: string): void {
  if (!value.trim() || value.includes('/') || value === '.' || value === '..') {
    throw new TenancyError('SCOPE_INVALID', `${label} id is invalid`);
  }
}

function uniqueCapabilities(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map((capability) => capability.trim()).filter(Boolean))].sort();
}
