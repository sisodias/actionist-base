import type { BlockMount, Health, KnowledgeRuntimeConfig } from './host';
import { clearKnowledgeEmbedConfig, createKnowledgeBindings, fetchKnowledgeIdentity, installKnowledgeEmbedConfig, installKnowledgeHostSession, knowledgeRuntime } from './knowledge';

export const fixtureBlock: BlockMount = {
  id: 'actionist/fixture', version: '0.1.0', route: '/fixture', capability: 'fixture.view', label: 'Fixture',
  async mount(target) {
    target.innerHTML = '<div data-verify="fixture-block"><strong>Native fixture block</strong><p>Mounted through the host lifecycle.</p></div>';
    return () => { target.replaceChildren(); };
  },
  health: async (): Promise<Health> => ({ status: 'healthy' }),
};

export function affineBlock(config: KnowledgeRuntimeConfig = knowledgeRuntime): BlockMount {
  let identity: Awaited<ReturnType<typeof fetchKnowledgeIdentity>> | undefined;
  return {
    id: 'actionist/affine-workspace', version: '0.2.0', route: '/knowledge', capability: 'knowledge.view', label: 'Knowledge',
    async preload() {
      installKnowledgeHostSession(config);
      identity = await fetchKnowledgeIdentity(config);
      if (!identity.capabilities.includes('view') || !identity.capabilities.includes('edit')) throw new Error('Knowledge identity capability denied');
      installKnowledgeEmbedConfig(config);
      const mod = await import(/* @vite-ignore */ config.moduleUrl) as { preload?: (options?: unknown) => Promise<void> };
      await mod.preload?.();
    },
    async mount(target, ctx) {
      installKnowledgeHostSession(config);
      identity ??= await fetchKnowledgeIdentity(config);
      if (identity.workspaceId !== ctx.workspaceId) throw new Error('Knowledge workspace mismatch');
      if (!identity.capabilities.includes('view') || !identity.capabilities.includes('edit')) throw new Error('Knowledge identity capability denied');
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
    health: async () => {
      try {
        installKnowledgeHostSession(config);
        identity = await fetchKnowledgeIdentity(config);
        const response = await fetch(`${config.backendBase.replace(/\/$/, '')}/api/auth/session`, { credentials: 'include' });
        if (!response.ok) return { status: 'unavailable', detail: `Knowledge backend unavailable (${response.status})` };
        const session = await response.json() as { user?: { id?: string; workspaceId?: string } };
        if (session.user?.id !== identity.userId) {
          return { status: 'unavailable', detail: 'Knowledge backend session mismatch' };
        }
        const workspaceResponse = await fetch(`${config.backendBase.replace(/\/$/, '')}/graphql`, {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', 'x-siso-request-context': identity.token },
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
        return { status: 'healthy' };
      } catch (error) {
        return { status: 'unavailable', detail: error instanceof Error ? error.message : 'Knowledge runtime unavailable' };
      }
    },
  };
}
