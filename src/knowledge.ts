import type { KnowledgeIdentity, KnowledgeRuntimeConfig, RuntimeBindings } from './host';

const defaultModuleUrl = '/knowledge-module/siso-knowledge-module.js';
const defaultBackendBase = '/knowledge-backend';
const defaultIssuerUrl = '/knowledge-issuer';
const embedConfigStorageKey = 'siso:embedded-config';

export const knowledgeRuntime: KnowledgeRuntimeConfig = {
  moduleUrl: import.meta.env.VITE_AFFINE_MODULE_URL ?? defaultModuleUrl,
  backendBase: import.meta.env.VITE_AFFINE_BACKEND_URL ?? defaultBackendBase,
  issuerUrl: import.meta.env.VITE_AFFINE_ISSUER_URL ?? defaultIssuerUrl,
  expectedClientId: import.meta.env.VITE_AFFINE_CLIENT_ID ?? 'bykonz-yard',
  hostSessionCookie: import.meta.env.DEV ? 'knowledge-local-disposable-session' : undefined,
};

export function installKnowledgeHostSession(config: KnowledgeRuntimeConfig = knowledgeRuntime) {
  if (!config.hostSessionCookie) return;
  document.cookie = `siso_host_session=${encodeURIComponent(config.hostSessionCookie)}; Path=/; SameSite=Lax`;
}

export function installKnowledgeEmbedConfig(config: KnowledgeRuntimeConfig = knowledgeRuntime) {
  try {
    sessionStorage.setItem(embedConfigStorageKey, JSON.stringify({
      embedded: true,
      hostOrigin: location.origin,
      mode: 'docs',
      serverOrigin: new URL(config.backendBase, location.origin).origin,
    }));
  } catch {
    // Restricted browsing contexts may not expose sessionStorage.
  }
}

export function clearKnowledgeEmbedConfig() {
  try {
    sessionStorage.removeItem(embedConfigStorageKey);
  } catch {
    // Restricted browsing contexts may not expose sessionStorage.
  }
}

export async function revokeKnowledgeHostSession(config: KnowledgeRuntimeConfig = knowledgeRuntime) {
  const response = await fetch(`${config.issuerUrl.replace(/\/$/, '')}/api/siso/revoke`, {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Knowledge host session revoke failed (${response.status})`);
  document.cookie = 'siso_host_session=; Max-Age=0; Path=/; SameSite=Lax';
}

export async function fetchKnowledgeIdentity(config: KnowledgeRuntimeConfig = knowledgeRuntime): Promise<KnowledgeIdentity> {
  const response = await fetch(`${config.issuerUrl.replace(/\/$/, '')}/api/siso/knowledge-context`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Knowledge identity unavailable (${response.status})`);
  const identity = await response.json() as KnowledgeIdentity;
  if (identity.clientId !== config.expectedClientId) throw new Error('Knowledge identity client mismatch');
  if (Date.parse(identity.expiresAt) <= Date.now()) throw new Error('Knowledge identity expired');
  if (!identity.userId || !identity.workspaceId || !identity.token || !Array.isArray(identity.capabilities) || identity.capabilities.length === 0) {
    throw new Error('Knowledge identity incomplete');
  }
  return identity;
}

export function createKnowledgeBindings(identity: KnowledgeIdentity, config: KnowledgeRuntimeConfig = knowledgeRuntime): RuntimeBindings {
  return {
    apiBaseUrl: config.backendBase,
    identity: { issue: async () => identity.token },
    data: { postgresSchema: 'knowledge', redisNamespace: 'knowledge', objectNamespace: 'knowledge' },
    tokens: {
      resolve: keys => Object.fromEntries(keys.map(key => [key, key === 'sisoRequestContext' ? identity.token : ''])),
    },
    ports: {
      emit: async () => undefined,
      command: async () => ({ ok: false, error: 'Knowledge command port unavailable in fixture' }),
    },
  };
}
