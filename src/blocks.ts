import { compareSemanticReadback, type BlockMount, type DonorSemanticReadback, type Health, type HostAccessGrant, type HostAccessPort, type HostAccessRequest, type HostContext, type KnowledgeIdentity, type KnowledgeRuntimeConfig } from './host';
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
            tenantId: grant.readback.tenantId,
            workspaceId: identity.workspaceId,
            expiresAt: identity.expiresAt,
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
      if (!access) return { status: 'unavailable', detail: 'Base access port is not configured' };
      try {
        const grant = await issue(ctx);
        const identity = knowledgeIdentityFromGrant(grant);
        const response = await fetch(`${config.backendBase.replace(/\/$/, '')}/api/auth/session`, { credentials: 'include' });
        if (!response.ok) return { status: 'unavailable', detail: `Knowledge backend unavailable (${response.status})` };
        const session = await response.json() as { user?: { id?: string; workspaceId?: string } };
        if (session.user?.id !== identity.userId) {
          return { status: 'unavailable', detail: 'Knowledge backend session mismatch' };
        }
        const workspaceResponse = await fetch(`${config.backendBase.replace(/\/$/, '')}/graphql`, {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', 'x-siso-request-context': grant.assertion },
          body: JSON.stringify({
            query: 'query KnowledgeHealth($workspaceId: String!) { currentUser { id } workspace(id: $workspaceId) { id } }',
            variables: { workspaceId: identity.workspaceId },
          }),
        });
        if (!workspaceResponse.ok) return { status: 'unavailable', detail: `Knowledge backend workspace unavailable (${workspaceResponse.status})` };
        const workspaceResult = await workspaceResponse.json() as { data?: { currentUser?: { id?: string }; workspace?: { id?: string } }; errors?: unknown[] };
        if (workspaceResult.errors?.length || workspaceResult.data?.currentUser?.id !== identity.userId || workspaceResult.data.workspace?.id !== identity.workspaceId) {
          return { status: 'unavailable', detail: 'Knowledge backend workspace session mismatch' };
        }
        const semanticPath = config.semanticReadbackPath ?? '/api/siso/host-context';
        const semanticResponse = await fetch(`${config.backendBase.replace(/\/$/, '')}${semanticPath.startsWith('/') ? semanticPath : `/${semanticPath}`}`, {
          credentials: 'include',
          headers: { accept: 'application/json', 'x-siso-request-context': grant.assertion },
        });
        if (!semanticResponse.ok) return { status: 'unavailable', detail: `Knowledge semantic readback unavailable (${semanticResponse.status})` };
        const semanticReadback = await semanticResponse.json() as DonorSemanticReadback;
        return compareSemanticReadback(grant.readback, semanticReadback);
      } catch (error) {
        return { status: 'unavailable', detail: error instanceof Error ? error.message : 'Knowledge runtime unavailable' };
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
    || readback.audience !== AFFINE_ACCESS_REQUEST.audience
    || readback.clientId !== config.expectedClientId
  ) {
    throw new Error('Base access readback mismatch');
  }
  if (!AFFINE_ACCESS_REQUEST.requiredCapabilities.every((capability) => readback.capabilities.includes(capability))) {
    throw new Error('Base access capability denied');
  }
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
