/** Internal, experimental Actionist block SDK candidate. Proven seams only. */

export type BlockContext = {
  tenantId: string;
  workspaceId: string;
  principalId: string;
  correlationId: string;
};

export type RuntimeNamespace = {
  name: string;
  owner: string;
  postgresSchema?: string;
  redisNamespace?: string;
  objectNamespace?: string;
};

export type SessionState = {
  authenticated: boolean;
  workspaceId?: string;
  expiresAt?: string;
  capabilities?: readonly string[];
};

export interface SessionAdapter<TSession = unknown> {
  establish(context: BlockContext): Promise<TSession>;
  inspect(session: TSession, context: BlockContext): Promise<SessionState>;
  revoke(session: TSession, context: BlockContext): Promise<void>;
}

export type SemanticHealth =
  | { status: 'healthy'; detail?: string }
  | { status: 'unavailable' | 'error'; detail: string };

export type BlockHealth = SemanticHealth & { authenticated?: boolean; workspaceMatches?: boolean };

export type InternalBlock<TSession = unknown> = {
  id: string;
  requiredCapabilities?: readonly string[];
  preload?: () => Promise<void>;
  health?: (context: BlockContext, session: TSession) => Promise<SemanticHealth>;
  mount: (target: HTMLElement, context: BlockContext, session: TSession) => Promise<void | (() => void | Promise<void>)>;
};

export function namespaceDescriptor(input: Omit<RuntimeNamespace, 'owner'> & { owner: string }): RuntimeNamespace {
  if (!input.name.trim()) throw new Error('namespace name is required');
  if (!input.owner.trim()) throw new Error('namespace owner is required');
  return { ...input };
}

export function assertOneOwner(namespaces: readonly RuntimeNamespace[]): void {
  const owners = new Map<string, string>();
  for (const namespace of namespaces) {
    const prior = owners.get(namespace.name);
    if (prior && prior !== namespace.owner) throw new Error(`namespace ${namespace.name} has multiple owners`);
    owners.set(namespace.name, namespace.owner);
  }
}

export function evaluateSession(state: SessionState, context: BlockContext): SemanticHealth {
  if (!state.authenticated) return { status: 'unavailable', detail: 'session is not authenticated' };
  if (state.workspaceId !== context.workspaceId) return { status: 'unavailable', detail: 'session workspace mismatch' };
  if (state.expiresAt && Date.parse(state.expiresAt) <= Date.now()) return { status: 'unavailable', detail: 'session expired' };
  return { status: 'healthy' };
}

export function conformanceChecks(state: SessionState, context: BlockContext, requiredCapabilities: readonly string[] = []): Record<string, boolean> {
  return {
    authenticated: state.authenticated,
    workspaceMatch: state.workspaceId === context.workspaceId,
    unexpired: !state.expiresAt || Date.parse(state.expiresAt) > Date.now(),
    capabilities: requiredCapabilities.every(capability => state.capabilities?.includes(capability) === true),
  };
}

/** Runs preload → establish session → semantic health → mount, always revoking on cleanup. */
export async function runLifecycle<TSession>(
  block: InternalBlock<TSession>,
  target: HTMLElement,
  context: BlockContext,
  adapter: SessionAdapter<TSession>,
  requiredCapabilitiesOrOnHealth: readonly string[] | ((health: BlockHealth) => void) = [],
  onHealthArgument: (health: BlockHealth) => void = () => undefined,
): Promise<() => Promise<void>> {
  const requiredCapabilities = Array.isArray(requiredCapabilitiesOrOnHealth)
    ? [...(block.requiredCapabilities ?? []), ...requiredCapabilitiesOrOnHealth]
    : [...(block.requiredCapabilities ?? [])];
  const onHealth = typeof requiredCapabilitiesOrOnHealth === 'function' ? requiredCapabilitiesOrOnHealth : onHealthArgument;
  onHealth({ status: 'unavailable', detail: 'loading', authenticated: false, workspaceMatches: false });
  await block.preload?.();

  let session: TSession;
  try {
    session = await adapter.establish(context);
  } catch (error) {
    onHealth({ status: 'error', detail: error instanceof Error ? error.message : 'session establishment failed', authenticated: false, workspaceMatches: false });
    return async () => undefined;
  }

  const revoke = async () => adapter.revoke(session, context);
  let state: SessionState;
  try {
    state = await adapter.inspect(session, context);
  } catch (error) {
    await revoke();
    onHealth({ status: 'error', detail: error instanceof Error ? error.message : 'session inspection failed', authenticated: false, workspaceMatches: false });
    return async () => undefined;
  }

  const sessionHealth = evaluateSession(state, context);
  const checks = conformanceChecks(state, context, requiredCapabilities);
  if (sessionHealth.status !== 'healthy' || !checks.capabilities) {
    await revoke();
    onHealth({
      status: sessionHealth.status !== 'healthy' ? sessionHealth.status : 'unavailable',
      detail: sessionHealth.status !== 'healthy' ? sessionHealth.detail : 'session lacks required capability',
      authenticated: state.authenticated,
      workspaceMatches: checks.workspaceMatch,
    });
    return async () => undefined;
  }

  let health: SemanticHealth;
  try {
    health = await block.health?.(context, session) ?? { status: 'healthy' };
  } catch (error) {
    await revoke();
    onHealth({ status: 'error', detail: error instanceof Error ? error.message : 'block health failed', authenticated: true, workspaceMatches: true });
    return async () => undefined;
  }
  onHealth({ ...health, authenticated: true, workspaceMatches: true });
  if (health.status !== 'healthy') {
    await revoke();
    return async () => undefined;
  }

  let unmount: void | (() => void | Promise<void>);
  try {
    unmount = await block.mount(target, context, session);
  } catch (error) {
    await revoke();
    throw error;
  }
  return async () => {
    try {
      await unmount?.();
    } finally {
      await revoke();
    }
  };
}
