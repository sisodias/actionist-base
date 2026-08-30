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
export type Health = { status: 'loading' | 'healthy' | 'degraded' | 'unavailable' | 'error'; detail?: string };
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
  principalId: string;
  principalKind: PrincipalKind;
  tenantId: string;
  workspaceId: string;
  capabilities: readonly string[];
  issuedAt: string;
  expiresAt: string;
};
export type HostAccessReadback = HostAssertionClaims & { authenticated: true; assertionPresent: true };
export type HostAccessGrant = { assertion: string; readback: HostAccessReadback };
export type HostAccessPort = { issue(context: HostContext, request: HostAccessRequest): Promise<HostAccessGrant> };
export type DonorSemanticReadback = {
  authenticated: boolean;
  issuer: string;
  audience: string;
  clientId: string;
  principalId: string;
  tenantId: string;
  workspaceId: string;
  capabilities: readonly string[];
  expiresAt: string;
};
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

export function compareSemanticReadback(expected: HostAccessReadback, actual: DonorSemanticReadback, now = Date.now()): Health {
  if (!actual.authenticated) return { status: 'unavailable', detail: 'Donor session is not authenticated' };
  const exactFields: Array<[keyof DonorSemanticReadback, string]> = [
    ['issuer', 'issuer'],
    ['audience', 'audience'],
    ['clientId', 'client'],
    ['principalId', 'principal'],
    ['tenantId', 'tenant'],
    ['workspaceId', 'workspace'],
  ];
  for (const [field, label] of exactFields) {
    if (actual[field] !== expected[field]) return { status: 'unavailable', detail: `Donor ${label} readback mismatch` };
  }
  const expectedExpiry = Date.parse(expected.expiresAt);
  const actualExpiry = Date.parse(actual.expiresAt);
  if (!Number.isFinite(expectedExpiry) || expectedExpiry <= now) return { status: 'unavailable', detail: 'Base access expired' };
  if (!Number.isFinite(actualExpiry) || actualExpiry <= now || actualExpiry > expectedExpiry) {
    return { status: 'unavailable', detail: 'Donor expiry readback mismatch' };
  }
  if (!expected.capabilities.every((capability) => actual.capabilities.includes(capability))) {
    return { status: 'unavailable', detail: 'Donor capability readback mismatch' };
  }
  return { status: 'healthy' };
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
