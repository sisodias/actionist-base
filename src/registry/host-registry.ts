import type { BlockMount, HostContext, HostFailureReasonCode, HostSessionReadback, NavGroup, NavItem } from '../host';
import { workspaceIdFromPath } from '../tenancy/workspace-selection';

export type HostBlockInstallation = {
  block: BlockMount;
  navigation: NavItem & { groupId: string; groupLabel: string };
  audience?: string;
  clientId?: string;
  requiredCapabilities: readonly string[];
};

export type HostRouteResolution =
  | { ok: true; block?: BlockMount }
  | { ok: false; reasonCode: HostFailureReasonCode };

export class HostBlockRegistry {
  private readonly installations = new Map<string, HostBlockInstallation>();

  install(input: HostBlockInstallation): void {
    const { block, navigation } = input;
    if (this.installations.has(block.id)) throw new Error(`block conflict: ${block.id}`);
    if (block.route === '/' || !block.route.startsWith('/')) throw new Error(`block route must be non-root: ${block.route}`);
    if ([...this.installations.values()].some((candidate) => candidate.block.route === block.route)) {
      throw new Error(`route conflict: ${block.route}`);
    }
    if (navigation.blockId !== block.id) throw new Error(`navigation block mismatch: ${block.id}`);
    if (navigation.route !== block.route) throw new Error(`navigation route mismatch: ${block.route}`);
    this.installations.set(block.id, {
      ...input,
      navigation: { ...navigation },
      requiredCapabilities: [...new Set(input.requiredCapabilities)].sort(),
    });
  }

  uninstall(blockId: string): HostBlockInstallation | undefined {
    const installation = this.installations.get(blockId);
    if (!installation) return undefined;
    this.installations.delete(blockId);
    return cloneInstallation(installation);
  }

  get(blockId: string): HostBlockInstallation | undefined {
    const installation = this.installations.get(blockId);
    return installation ? cloneInstallation(installation) : undefined;
  }

  list(): HostBlockInstallation[] {
    return [...this.installations.values()].map(cloneInstallation);
  }

  resolve(
    pathname: string,
    context: HostContext,
    session: HostSessionReadback,
    now = Date.now(),
  ): BlockMount | undefined {
    const resolution = this.resolveGuarded(pathname, context, session, now);
    return resolution.ok ? resolution.block : undefined;
  }

  resolveGuarded(
    pathname: string,
    context: HostContext,
    session: HostSessionReadback,
    now = Date.now(),
  ): HostRouteResolution {
    const authority = routeAuthority(context, session, now);
    if (!authority.ok) return authority;
    const pathWorkspaceId = workspaceIdFromPath(pathname);
    if (pathWorkspaceId !== context.workspaceId) return { ok: false, reasonCode: 'workspace_scope_mismatch' };
    const blockPath = pathname.replace(/^\/w\/[^/]+/, '') || '/';
    const installation = this.list()
      .filter(({ block }) => blockPath === block.route || blockPath.startsWith(`${block.route}/`))
      .sort((left, right) => right.block.route.length - left.block.route.length)[0];
    if (!installation) return { ok: true };
    if (!installation.requiredCapabilities.every((capability) => authority.grants.has(capability))) {
      return { ok: false, reasonCode: 'capability_denied' };
    }
    return { ok: true, block: installation.block };
  }

  navigationGroups(context: HostContext, session: HostSessionReadback, now = Date.now()): NavGroup[] {
    const authority = routeAuthority(context, session, now);
    if (!authority.ok) return [];
    const groups = new Map<string, NavGroup>();
    for (const installation of this.installations.values()) {
      if (!installation.requiredCapabilities.every((capability) => authority.grants.has(capability))) continue;
      const { groupId, groupLabel, ...item } = installation.navigation;
      const group = groups.get(groupId) ?? { id: groupId, label: groupLabel, items: [] };
      group.items.push({ ...item });
      groups.set(groupId, group);
    }
    return [...groups.values()].map((group) => ({ ...group, items: [...group.items] }));
  }
}

function routeAuthority(
  context: HostContext,
  session: HostSessionReadback,
  now: number,
): { ok: true; grants: Set<string> } | { ok: false; reasonCode: HostFailureReasonCode } {
  const expiresAt = Date.parse(session.expiresAt ?? '');
  if (session.status === 'missing') return { ok: false, reasonCode: 'session_missing' };
  if (session.status === 'expired') return { ok: false, reasonCode: 'session_expired' };
  if (session.status === 'revoked') return { ok: false, reasonCode: 'session_revoked' };
  if (session.status === 'logged_out') return { ok: false, reasonCode: 'session_logged_out' };
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return { ok: false, reasonCode: 'session_expired' };
  if (!session.authenticated) return { ok: false, reasonCode: 'semantic_readback_unavailable' };
  if (session.principalId !== context.principalId || session.principalKind !== context.principalKind) {
    return { ok: false, reasonCode: 'access_replay_denied' };
  }
  if (session.tenantId !== context.tenantId) return { ok: false, reasonCode: 'tenant_scope_mismatch' };
  if (session.workspaceId !== context.workspaceId) return { ok: false, reasonCode: 'workspace_scope_mismatch' };
  return { ok: true, grants: new Set(session.capabilities) };
}

function cloneInstallation(installation: HostBlockInstallation): HostBlockInstallation {
  return {
    ...installation,
    navigation: { ...installation.navigation },
    requiredCapabilities: [...installation.requiredCapabilities],
  };
}
