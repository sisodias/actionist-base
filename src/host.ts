import type { ReactNode } from 'react';

export type PrincipalKind = 'employee' | 'client' | 'service' | 'system';
export type HostContext = { tenantId: string; workspaceId: string; principalId: string; principalKind: PrincipalKind; teamIds: string[]; clientAccountIds: string[]; correlationId: string };
export type RuntimeBindings = { apiBaseUrl: string; identity: { issue(audience: string, context: HostContext): Promise<string> }; data: { postgresSchema?: string; redisNamespace?: string; objectNamespace?: string }; tokens: { resolve(keys: string[]): Record<string, string> }; ports: { emit(event: EventEnvelope): Promise<void>; command(c: Command): Promise<Result> } };
export type KnowledgeIdentity = { userId: string; email: string; displayName?: string; clientId: string; workspaceId: string; expiresAt: string; capabilities: Array<'view' | 'edit' | 'share' | 'admin'>; token: string };
export type KnowledgeRuntimeConfig = { moduleUrl: string; backendBase: string; issuerUrl: string; expectedClientId: string };
export type EventEnvelope = { type: string; version: number; actor: HostContext; payload: unknown; correlationId: string; idempotencyKey: string };
export type Command = { type: string; payload: unknown };
export type Result = { ok: boolean; value?: unknown; error?: string };
export type Health = { status: 'loading' | 'healthy' | 'degraded' | 'unavailable' | 'error'; detail?: string };
export type Unmount = () => void | Promise<void>;
export type BlockMount = { id: string; version: string; route: string; capability: string; label: string; preload?: () => Promise<void>; mount(target: HTMLElement, ctx: HostContext, bindings: RuntimeBindings): Promise<Unmount>; health?: (ctx: HostContext, bindings: RuntimeBindings) => Promise<Health> };
export type NavItem = { id: string; label: string; route: string; icon?: string; blockId?: string; capability?: string };
export type NavGroup = { id: string; label: string; items: NavItem[]; collapsible?: boolean };
export type ProductRecipe = { name: string; subtitle: string; navigation: NavGroup[]; tokens: Record<string, string> };

export class BlockRegistry {
  private blocks = new Map<string, BlockMount>();
  register(block: BlockMount) { if (this.blocks.has(block.id)) throw new Error(`block conflict: ${block.id}`); if ([...this.blocks.values()].some(b => b.route === block.route)) throw new Error(`route conflict: ${block.route}`); this.blocks.set(block.id, block); }
  get(id: string) { return this.blocks.get(id); }
  list() { return [...this.blocks.values()]; }
  resolve(pathname: string) { return this.list().find(b => pathname === b.route || pathname.startsWith(`${b.route}/`)); }
}

export function can(context: HostContext, capability: string, grants: Record<string, string[]>): boolean { return (grants[context.principalId] ?? []).includes(capability); }
export function workspaceMatches(pathWorkspaceId: string, context: HostContext) { return pathWorkspaceId === context.workspaceId; }

export function fixtureIdentity(audience: string, context: HostContext) { return Promise.resolve(`fixture.${audience}.${context.tenantId}.${context.workspaceId}.${context.principalId}`); }
export const fixtureBindings: RuntimeBindings = { apiBaseUrl: '', identity: { issue: fixtureIdentity }, data: {}, tokens: { resolve: keys => Object.fromEntries(keys.map(k => [k, ''])) }, ports: { emit: async () => undefined, command: async () => ({ ok: false, error: 'fixture command unavailable' }) } };

export type ShellProps = { recipe: ProductRecipe; active?: string; children: ReactNode; onNavigate: (route: string) => void };

export async function runBlockLifecycle(block: BlockMount, target: HTMLElement, context: HostContext, bindings: RuntimeBindings, onHealth: (health: Health) => void): Promise<Unmount> {
  onHealth({ status: 'loading' });
  await block.preload?.();
  const health = await block.health?.(context, bindings);
  if (health) { onHealth(health); if (health.status === 'unavailable' || health.status === 'error') return () => undefined; }
  return block.mount(target, context, bindings);
}
