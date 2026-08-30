import type { ReactNode } from 'react';
import type { ProductTheme } from './tokens';

export type PrincipalKind = 'employee' | 'client' | 'service' | 'system';
export type HostContext = { tenantId: string; workspaceId: string; principalId: string; principalKind: PrincipalKind; teamIds: string[]; clientAccountIds: string[]; correlationId: string };
export type RuntimeBindings = { apiBaseUrl: string; identity: { issue(audience: string, context: HostContext): Promise<string> }; data: { postgresSchema?: string; redisNamespace?: string; objectNamespace?: string }; tokens: { resolve(keys: string[]): Record<string, string> }; ports: { emit(event: EventEnvelope): Promise<void>; command(c: Command): Promise<Result> } };
export type KnowledgeIdentity = { userId: string; email: string; displayName?: string; clientId: string; workspaceId: string; expiresAt: string; capabilities: Array<'view' | 'edit' | 'share' | 'admin'>; token: string };
export type KnowledgeRuntimeConfig = { moduleUrl: string; backendBase: string; issuerUrl: string; expectedClientId: string; hostSessionCookie?: string; semanticReadbackPath?: string };
export type EventEnvelope = { type: string; version: number; actor: HostContext; payload: unknown; correlationId: string; idempotencyKey: string };
export type Command = { type: string; payload: unknown };
export type Result = { ok: boolean; value?: unknown; error?: string };
export type HostFailureReasonCode =
  | 'session_missing'
  | 'session_expired'
  | 'session_revoked'
  | 'session_logged_out'
  | 'issuer_mismatch'
  | 'audience_denied'
  | 'audience_mismatch'
  | 'client_denied'
  | 'client_mismatch'
  | 'tenant_scope_mismatch'
  | 'workspace_scope_mismatch'
  | 'capability_denied'
  | 'assertion_issue_failed'
  | 'semantic_readback_unavailable'
  | 'access_replay_denied';
export type Health = { status: 'loading' | 'healthy' | 'degraded' | 'unavailable' | 'error'; reasonCode?: HostFailureReasonCode; detail?: string };
export type Unmount = () => void | Promise<void>;
export type HostSessionReadback = {
  status: 'missing' | 'active' | 'expired' | 'revoked' | 'logged_out';
  authenticated: boolean;
  issuer: string;
  sessionId: string | null;
  principalId: string | null;
  principalKind: PrincipalKind | null;
  tenantId: string | null;
  workspaceId: string | null;
  capabilities: readonly string[];
  issuedAt: string | null;
  expiresAt: string | null;
};
export type HostAccessRequest = { audience: string; clientId: string; requiredCapabilities: readonly string[] };
export type HostAssertionClaims = {
  issuer: string;
  audience: string;
  clientId: string;
  sessionId: string;
  accessId: string;
  principalId: string;
  principalKind: PrincipalKind;
  tenantId: string;
  workspaceId: string;
  capabilities: readonly string[];
  issuedAt: string;
  expiresAt: string;
  correlationId: string;
};
export type HostAccessReadback = HostAssertionClaims & { authenticated: true; assertionPresent: true };
export type HostAccessGrant = { assertion: string; readback: HostAccessReadback };
export type HostAccessPort = {
  inspect(): Promise<HostSessionReadback>;
  issue(context: HostContext, request: HostAccessRequest): Promise<HostAccessGrant>;
};
export type DonorSemanticReadback = {
  authenticated: boolean;
  issuer: string;
  audience: string;
  clientId: string;
  sessionId: string;
  accessId: string;
  principalId: string;
  tenantId: string;
  workspaceId: string;
  capabilities: readonly string[];
  issuedAt: string;
  expiresAt: string;
  correlationId: string;
};
export const AFFINE_ACCESS_WIRE_SCHEMA = 'actionist.base.affine-access.v1' as const;
export type HostSessionReadbackWire = {
  schema_version: typeof AFFINE_ACCESS_WIRE_SCHEMA;
  status: HostSessionReadback['status'];
  authenticated: boolean;
  issuer: string;
  session_id: string | null;
  principal_id: string | null;
  principal_kind: PrincipalKind | null;
  tenant_id: string | null;
  workspace_id: string | null;
  capabilities: readonly string[];
  issued_at: string | null;
  expires_at: string | null;
};
export type HostAccessReadbackWire = {
  schema_version: typeof AFFINE_ACCESS_WIRE_SCHEMA;
  authenticated: true;
  issuer: string;
  audience: string;
  client_id: string;
  session_id: string;
  access_id: string;
  principal_id: string;
  principal_kind: PrincipalKind;
  tenant_id: string;
  workspace_id: string;
  capabilities: readonly string[];
  issued_at: string;
  expires_at: string;
  assertion_present: true;
  correlation_id: string;
};
export type DonorSemanticReadbackWire = Omit<HostAccessReadbackWire, 'authenticated' | 'principal_kind' | 'assertion_present'> & { authenticated: boolean };

export function serializeHostSessionReadback(readback: HostSessionReadback): HostSessionReadbackWire {
  return {
    schema_version: AFFINE_ACCESS_WIRE_SCHEMA,
    status: readback.status,
    authenticated: readback.authenticated,
    issuer: readback.issuer,
    session_id: readback.sessionId,
    principal_id: readback.principalId,
    principal_kind: readback.principalKind,
    tenant_id: readback.tenantId,
    workspace_id: readback.workspaceId,
    capabilities: [...readback.capabilities],
    issued_at: readback.issuedAt,
    expires_at: readback.expiresAt,
  };
}

export function serializeHostAccessReadback(readback: HostAccessReadback): HostAccessReadbackWire {
  return {
    schema_version: AFFINE_ACCESS_WIRE_SCHEMA,
    authenticated: true,
    issuer: readback.issuer,
    audience: readback.audience,
    client_id: readback.clientId,
    session_id: readback.sessionId,
    access_id: readback.accessId,
    principal_id: readback.principalId,
    principal_kind: readback.principalKind,
    tenant_id: readback.tenantId,
    workspace_id: readback.workspaceId,
    capabilities: [...readback.capabilities],
    issued_at: readback.issuedAt,
    expires_at: readback.expiresAt,
    assertion_present: true,
    correlation_id: readback.correlationId,
  };
}

export function serializeDonorSemanticReadback(readback: DonorSemanticReadback): DonorSemanticReadbackWire {
  return {
    schema_version: AFFINE_ACCESS_WIRE_SCHEMA,
    authenticated: readback.authenticated,
    issuer: readback.issuer,
    audience: readback.audience,
    client_id: readback.clientId,
    session_id: readback.sessionId,
    access_id: readback.accessId,
    principal_id: readback.principalId,
    tenant_id: readback.tenantId,
    workspace_id: readback.workspaceId,
    capabilities: [...readback.capabilities],
    issued_at: readback.issuedAt,
    expires_at: readback.expiresAt,
    correlation_id: readback.correlationId,
  };
}

export function parseDonorSemanticReadback(value: unknown): DonorSemanticReadback {
  if (!value || typeof value !== 'object') throw new Error('Donor semantic readback schema mismatch');
  const wire = value as Record<string, unknown>;
  const stringFields = [
    'issuer',
    'audience',
    'client_id',
    'session_id',
    'access_id',
    'principal_id',
    'tenant_id',
    'workspace_id',
    'issued_at',
    'expires_at',
    'correlation_id',
  ] as const;
  if (
    wire.schema_version !== AFFINE_ACCESS_WIRE_SCHEMA
    || typeof wire.authenticated !== 'boolean'
    || stringFields.some((field) => typeof wire[field] !== 'string')
    || !Array.isArray(wire.capabilities)
    || !wire.capabilities.every((capability) => typeof capability === 'string')
  ) {
    throw new Error('Donor semantic readback schema mismatch');
  }
  return {
    authenticated: wire.authenticated,
    issuer: wire.issuer as string,
    audience: wire.audience as string,
    clientId: wire.client_id as string,
    sessionId: wire.session_id as string,
    accessId: wire.access_id as string,
    principalId: wire.principal_id as string,
    tenantId: wire.tenant_id as string,
    workspaceId: wire.workspace_id as string,
    capabilities: [...wire.capabilities],
    issuedAt: wire.issued_at as string,
    expiresAt: wire.expires_at as string,
    correlationId: wire.correlation_id as string,
  };
}
export type BlockMount = { id: string; version: string; route: string; capability: string; label: string; preload?: (ctx: HostContext, bindings: RuntimeBindings) => Promise<void>; mount(target: HTMLElement, ctx: HostContext, bindings: RuntimeBindings): Promise<Unmount>; health?: (ctx: HostContext, bindings: RuntimeBindings) => Promise<Health> };
export type NavItem = { id: string; label: string; route: string; icon?: string; blockId?: string; capability?: string };
export type NavGroup = { id: string; label: string; items: NavItem[]; collapsible?: boolean };
export type ProductRecipe = {
  id?: string;
  name: string;
  subtitle: string;
  navigation: NavGroup[];
  settings?: NavItem;
  theme?: ProductTheme;
};

export class BlockRegistry {
  private blocks = new Map<string, BlockMount>();
  register(block: BlockMount) { if (this.blocks.has(block.id)) throw new Error(`block conflict: ${block.id}`); if ([...this.blocks.values()].some(b => b.route === block.route)) throw new Error(`route conflict: ${block.route}`); this.blocks.set(block.id, block); }
  get(id: string) { return this.blocks.get(id); }
  list() { return [...this.blocks.values()]; }
  resolve(pathname: string) { return this.list().find(b => pathname === b.route || pathname.startsWith(`${b.route}/`)); }
}

export function can(context: HostContext, capability: string, grants: Record<string, string[]>): boolean { return (grants[context.principalId] ?? []).includes(capability); }
export function workspaceMatches(pathWorkspaceId: string, context: HostContext) { return pathWorkspaceId === context.workspaceId; }

export function compareSemanticReadback(
  expected: HostAccessReadback,
  actual: DonorSemanticReadback,
  session: HostSessionReadback,
  now = Date.now(),
): Health {
  const unavailable = (reasonCode: HostFailureReasonCode, detail: string): Health => ({ status: 'unavailable', reasonCode, detail });
  if (session.status !== 'active') {
    const reasonByStatus: Record<Exclude<HostSessionReadback['status'], 'active'>, HostFailureReasonCode> = {
      missing: 'session_missing',
      expired: 'session_expired',
      revoked: 'session_revoked',
      logged_out: 'session_logged_out',
    };
    return unavailable(reasonByStatus[session.status], `Base session is ${session.status}`);
  }
  if (!session.authenticated) return unavailable('semantic_readback_unavailable', 'Base session is not authenticated');
  if (session.issuer !== expected.issuer) return unavailable('issuer_mismatch', 'Base session issuer mismatch');
  if (session.sessionId !== expected.sessionId) return unavailable('access_replay_denied', 'Base session readback mismatch');
  if (session.principalId !== expected.principalId || session.principalKind !== expected.principalKind) {
    return unavailable('semantic_readback_unavailable', 'Base session principal mismatch');
  }
  if (session.tenantId !== expected.tenantId) return unavailable('tenant_scope_mismatch', 'Base session tenant mismatch');
  if (session.workspaceId !== expected.workspaceId) return unavailable('workspace_scope_mismatch', 'Base session workspace mismatch');
  if (!actual.authenticated) return unavailable('semantic_readback_unavailable', 'Donor session is not authenticated');

  const exactFields: Array<[keyof DonorSemanticReadback, keyof HostAccessReadback, HostFailureReasonCode, string]> = [
    ['issuer', 'issuer', 'issuer_mismatch', 'issuer'],
    ['audience', 'audience', 'audience_mismatch', 'audience'],
    ['clientId', 'clientId', 'client_mismatch', 'client'],
    ['sessionId', 'sessionId', 'access_replay_denied', 'session'],
    ['accessId', 'accessId', 'access_replay_denied', 'access'],
    ['principalId', 'principalId', 'semantic_readback_unavailable', 'principal'],
    ['tenantId', 'tenantId', 'tenant_scope_mismatch', 'tenant'],
    ['workspaceId', 'workspaceId', 'workspace_scope_mismatch', 'workspace'],
    ['correlationId', 'correlationId', 'access_replay_denied', 'correlation'],
  ];
  for (const [actualField, expectedField, reasonCode, label] of exactFields) {
    if (actual[actualField] !== expected[expectedField]) return unavailable(reasonCode, `Donor ${label} readback mismatch`);
  }

  const sessionIssuedAt = Date.parse(session.issuedAt ?? '');
  const accessIssuedAt = Date.parse(expected.issuedAt);
  const donorIssuedAt = Date.parse(actual.issuedAt);
  const donorExpiresAt = Date.parse(actual.expiresAt);
  const accessExpiresAt = Date.parse(expected.expiresAt);
  const sessionExpiresAt = Date.parse(session.expiresAt ?? '');
  const timestamps = [sessionIssuedAt, accessIssuedAt, donorIssuedAt, donorExpiresAt, accessExpiresAt, sessionExpiresAt];
  if (
    !timestamps.every(Number.isFinite)
    || sessionIssuedAt > accessIssuedAt
    || accessIssuedAt > donorIssuedAt
    || donorIssuedAt > now
    || now >= donorExpiresAt
    || donorExpiresAt > accessExpiresAt
    || accessExpiresAt > sessionExpiresAt
  ) {
    return unavailable('semantic_readback_unavailable', 'Donor expiry readback mismatch');
  }

  const expectedCapabilities = normalizeCapabilities(expected.capabilities);
  const actualCapabilities = normalizeCapabilities(actual.capabilities);
  if (
    expectedCapabilities.length !== actualCapabilities.length
    || expectedCapabilities.some((capability, index) => capability !== actualCapabilities[index])
  ) {
    return unavailable('capability_denied', 'Donor capability readback mismatch');
  }
  return { status: 'healthy' };
}

function normalizeCapabilities(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map((capability) => capability.trim()).filter(Boolean))].sort();
}

export function fixtureIdentity(audience: string, context: HostContext) { return Promise.resolve(`fixture.${audience}.${context.tenantId}.${context.workspaceId}.${context.principalId}`); }
export const fixtureBindings: RuntimeBindings = { apiBaseUrl: '', identity: { issue: fixtureIdentity }, data: {}, tokens: { resolve: keys => Object.fromEntries(keys.map(k => [k, ''])) }, ports: { emit: async () => undefined, command: async () => ({ ok: false, error: 'fixture command unavailable' }) } };

export type ShellWorkspace = { id?: string; name: string; detail?: string };
export type ShellProps = {
  recipe: ProductRecipe;
  active?: string;
  children: ReactNode;
  onNavigate: (route: string) => void;
  workspace?: ShellWorkspace;
};
export type ShellComponent = (props: ShellProps) => ReactNode;

export async function cleanupBlockMount(target: HTMLElement, unmount?: Unmount | null) {
  try { await unmount?.(); } finally { target.replaceChildren(); }
}

export async function runBlockLifecycle(block: BlockMount, target: HTMLElement, context: HostContext, bindings: RuntimeBindings, onHealth: (health: Health) => void, isActive?: () => boolean): Promise<Unmount> {
  const active = () => !isActive || isActive();
  if (!active()) return () => undefined;
  onHealth({ status: 'loading' });
  await block.preload?.(context, bindings);
  if (!active()) return () => undefined;
  const health = await block.health?.(context, bindings);
  if (health) { onHealth(health); if (health.status === 'unavailable' || health.status === 'error') return () => undefined; }
  if (!active()) return () => undefined;
  return block.mount(target, context, bindings);
}
