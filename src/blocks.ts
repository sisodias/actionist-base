import { compareSemanticReadback, parseDonorSemanticReadback, type BlockMount, type Health, type HostAccessGrant, type HostAccessPort, type HostAccessRequest, type HostContext, type HostFailureReasonCode, type KnowledgeIdentity, type KnowledgeRuntimeConfig } from './host';
import { clearKnowledgeEmbedConfig, createKnowledgeBindings, installKnowledgeEmbedConfig, knowledgeRuntime } from './knowledge';

export const AFFINE_ACCESS_REQUEST: HostAccessRequest = {
  audience: 'actionist/affine-workspace',
  clientId: 'bykonz-yard',
  requiredCapabilities: ['knowledge.view', 'knowledge.edit'],
};

export const fixtureBlock: BlockMount = {
  id: 'actionist/fixture', version: '0.1.0', route: '/fixture', capability: 'fixture.view', label: 'Fixture',
  async mount(target) {
    target.innerHTML = '<div data-verify="fixture-block"><strong>Native fixture block</strong><p>Mounted through the host lifecycle.</p></div>';
    return () => { target.replaceChildren(); };
  },
  health: async (): Promise<Health> => ({ status: 'healthy' }),
};

export function affineBlock(access?: HostAccessPort, config: KnowledgeRuntimeConfig = knowledgeRuntime): BlockMount {
  const issue = async (ctx: HostContext) => {
    if (!access) throw new Error('Base access port is not configured');
    const grant = await access.issue(ctx, { ...AFFINE_ACCESS_REQUEST, clientId: config.expectedClientId });
    assertGrantMatchesContext(grant, ctx, config);
    return grant;
  };
  return {
    id: 'actionist/affine-workspace', version: '0.2.0', route: '/knowledge', capability: 'knowledge.view', label: 'Knowledge',
    async preload(ctx) {
      if (!access) return;
      await issue(ctx);
      installKnowledgeEmbedConfig(config);
      const mod = await import(/* @vite-ignore */ config.moduleUrl) as { preload?: (options?: unknown) => Promise<void> };
      await mod.preload?.();
    },
    async mount(target, ctx) {
      const grant = await issue(ctx);
      const identity = knowledgeIdentityFromGrant(grant);
      installKnowledgeEmbedConfig(config);
      const bindings = createKnowledgeBindings(identity, config);
      const mod = await import(/* @vite-ignore */ config.moduleUrl) as {
        mount?: (el: HTMLElement, options: unknown) => Promise<() => void> | (() => void);
      };
      if (!mod.mount) throw new Error('AFFiNE module does not export mount');
      const unmount = await mod.mount(target, {
        host: {
          identity: {
            userId: identity.userId,
            email: identity.email,
            displayName: identity.displayName,
            clientId: identity.clientId,
            issuer: grant.readback.issuer,
            audience: grant.readback.audience,
            sessionId: grant.readback.sessionId,
            accessId: grant.readback.accessId,
            tenantId: grant.readback.tenantId,
            workspaceId: identity.workspaceId,
            issuedAt: grant.readback.issuedAt,
            expiresAt: identity.expiresAt,
            correlationId: grant.readback.correlationId,
            capabilities: identity.capabilities,
          },
          database: { config: { schema: 'knowledge', redisNamespace: 'knowledge', yjsNamespace: 'knowledge', blobNamespace: 'knowledge' } },
          tokens: { sisoRequestContext: identity.token },
        },
        context: ctx,
        bindings,
        backendBase: config.backendBase,
        initialPath: `/workspace/${identity.workspaceId}/all`,
      });
      return async () => {
        try {
          await unmount?.();
        } finally {
          clearKnowledgeEmbedConfig();
        }
      };
    },
    health: async (ctx) => {
      if (!access) return unavailable('semantic_readback_unavailable', 'Base access port is not configured');
      try {
        const grant = await issue(ctx);
        const identity = knowledgeIdentityFromGrant(grant);
        const response = await fetch(`${config.backendBase.replace(/\/$/, '')}/api/auth/session`, {
          credentials: 'omit',
          headers: { accept: 'application/json', 'x-siso-request-context': grant.assertion },
        });
        if (!response.ok) return unavailable('semantic_readback_unavailable', `Knowledge backend unavailable (${response.status})`);
        const session = await response.json() as { user?: { id?: string; workspaceId?: string } };
        if (session.user?.id !== identity.userId) {
          return unavailable('access_replay_denied', 'Knowledge backend session mismatch');
        }
        const workspaceResponse = await fetch(`${config.backendBase.replace(/\/$/, '')}/graphql`, {
          method: 'POST',
          credentials: 'omit',
          headers: { accept: 'application/json', 'content-type': 'application/json', 'x-siso-request-context': grant.assertion },
          body: JSON.stringify({
            query: 'query KnowledgeHealth($workspaceId: String!) { currentUser { id } workspace(id: $workspaceId) { id } }',
            variables: { workspaceId: identity.workspaceId },
          }),
        });
        if (!workspaceResponse.ok) return unavailable('semantic_readback_unavailable', `Knowledge backend workspace unavailable (${workspaceResponse.status})`);
        const workspaceResult = await workspaceResponse.json() as { data?: { currentUser?: { id?: string }; workspace?: { id?: string } }; errors?: unknown[] };
        if (workspaceResult.errors?.length || workspaceResult.data?.currentUser?.id !== identity.userId || workspaceResult.data.workspace?.id !== identity.workspaceId) {
          return unavailable('workspace_scope_mismatch', 'Knowledge backend workspace session mismatch');
        }
        const semanticPath = config.semanticReadbackPath ?? '/api/siso/host-context';
        const semanticResponse = await fetch(`${config.backendBase.replace(/\/$/, '')}${semanticPath.startsWith('/') ? semanticPath : `/${semanticPath}`}`, {
          credentials: 'omit',
          headers: { accept: 'application/json', 'x-siso-request-context': grant.assertion },
        });
        if (!semanticResponse.ok) return unavailable('semantic_readback_unavailable', `Knowledge semantic readback unavailable (${semanticResponse.status})`);
        const semanticReadback = parseDonorSemanticReadback(await semanticResponse.json());
        const baseSession = await access.inspect();
        return compareSemanticReadback(grant.readback, semanticReadback, baseSession);
      } catch (error) {
        return unavailable(reasonFromAccessError(error), error instanceof Error ? error.message : 'Knowledge runtime unavailable');
      }
    },
  };
}

function assertGrantMatchesContext(grant: HostAccessGrant, ctx: HostContext, config: KnowledgeRuntimeConfig): void {
  const readback = grant.readback;
  if (
    !readback.authenticated
    || readback.principalId !== ctx.principalId
    || readback.tenantId !== ctx.tenantId
    || readback.workspaceId !== ctx.workspaceId
    || readback.correlationId !== ctx.correlationId
    || readback.audience !== AFFINE_ACCESS_REQUEST.audience
    || readback.clientId !== config.expectedClientId
    || !readback.sessionId.trim()
    || !readback.accessId.trim()
  ) {
    throw new Error('Base access readback mismatch');
  }
  const expectedCapabilities = normalizeCapabilities(AFFINE_ACCESS_REQUEST.requiredCapabilities);
  const grantedCapabilities = normalizeCapabilities(readback.capabilities);
  if (
    expectedCapabilities.length !== grantedCapabilities.length
    || expectedCapabilities.some((capability, index) => capability !== grantedCapabilities[index])
  ) {
    throw new Error('Base access capability denied');
  }
}

function unavailable(reasonCode: HostFailureReasonCode, detail: string): Health {
  return { status: 'unavailable', reasonCode, detail };
}

function reasonFromAccessError(error: unknown): HostFailureReasonCode {
  if (!error || typeof error !== 'object' || !('code' in error)) return 'semantic_readback_unavailable';
  const reasons: Record<string, HostFailureReasonCode> = {
    SESSION_MISSING: 'session_missing',
    SESSION_EXPIRED: 'session_expired',
    SESSION_REVOKED: 'session_revoked',
    SESSION_LOGGED_OUT: 'session_logged_out',
    AUDIENCE_DENIED: 'audience_denied',
    CLIENT_DENIED: 'client_denied',
    CAPABILITY_DENIED: 'capability_denied',
    ASSERTION_ISSUE_FAILED: 'assertion_issue_failed',
  };
  return reasons[String((error as { code: unknown }).code)] ?? 'semantic_readback_unavailable';
}

function normalizeCapabilities(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map((capability) => capability.trim()).filter(Boolean))].sort();
}

function knowledgeIdentityFromGrant(grant: HostAccessGrant): KnowledgeIdentity {
  const capabilities: KnowledgeIdentity['capabilities'] = [];
  if (grant.readback.capabilities.includes('knowledge.view')) capabilities.push('view');
  if (grant.readback.capabilities.includes('knowledge.edit')) capabilities.push('edit');
  if (grant.readback.capabilities.includes('knowledge.share')) capabilities.push('share');
  if (grant.readback.capabilities.includes('knowledge.admin')) capabilities.push('admin');
  return {
    userId: grant.readback.principalId,
    email: `${grant.readback.principalId}@actionist.invalid`,
    displayName: grant.readback.principalId,
    clientId: grant.readback.clientId,
    workspaceId: grant.readback.workspaceId,
    expiresAt: grant.readback.expiresAt,
    capabilities,
    token: grant.assertion,
  };
}
