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
  issuer?: string;
  audience?: string;
  clientId?: string;
  principalId?: string;
  tenantId?: string;
  workspaceId?: string;
  expiresAt?: string;
  capabilities?: readonly string[];
};

export type SessionContract = {
  issuer: string;
  audience: string;
  clientId: string;
};

export interface SessionAdapter<TSession = unknown> {
  establish(context: BlockContext): Promise<TSession>;
  inspect(session: TSession, context: BlockContext): Promise<SessionState>;
  revoke(session: TSession, context: BlockContext): Promise<void>;
}

export type SemanticHealth =
  | { status: 'healthy'; detail?: string }
  | { status: 'unavailable' | 'error'; detail: string };

export type BlockHealth = SemanticHealth & {
  authenticated?: boolean;
  principalMatches?: boolean;
  tenantMatches?: boolean;
  workspaceMatches?: boolean;
  issuerMatches?: boolean;
  audienceMatches?: boolean;
  clientMatches?: boolean;
  unexpired?: boolean;
  capabilitiesMatch?: boolean;
};

export async function cleanupMountedBlock(target: HTMLElement, unmount?: void | (() => void | Promise<void>)) {
  try {
    await unmount?.();
  } finally {
    target.replaceChildren();
  }
}

export type InternalBlock<TSession = unknown> = {
  id: string;
  sessionContract?: SessionContract;
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

export function evaluateSession(state: SessionState, context: BlockContext, contract?: SessionContract): SemanticHealth {
  if (!state.authenticated) return { status: 'unavailable', detail: 'session is not authenticated' };
  if (state.principalId !== context.principalId) return { status: 'unavailable', detail: 'session principal mismatch' };
  if (state.tenantId !== context.tenantId) return { status: 'unavailable', detail: 'session tenant mismatch' };
  if (state.workspaceId !== context.workspaceId) return { status: 'unavailable', detail: 'session workspace mismatch' };
  if (!state.expiresAt || !Number.isFinite(Date.parse(state.expiresAt)) || Date.parse(state.expiresAt) <= Date.now()) {
    return { status: 'unavailable', detail: 'session expired' };
  }
  if (contract && state.issuer !== contract.issuer) return { status: 'unavailable', detail: 'session issuer mismatch' };
  if (contract && state.audience !== contract.audience) return { status: 'unavailable', detail: 'session audience mismatch' };
  if (contract && state.clientId !== contract.clientId) return { status: 'unavailable', detail: 'session client mismatch' };
  return { status: 'healthy' };
}

export function conformanceChecks(state: SessionState, context: BlockContext, requiredCapabilities: readonly string[] = [], contract?: SessionContract): Record<string, boolean> {
  return {
    authenticated: state.authenticated,
    principalMatch: state.principalId === context.principalId,
    tenantMatch: state.tenantId === context.tenantId,
    workspaceMatch: state.workspaceId === context.workspaceId,
    issuerMatch: !contract || state.issuer === contract.issuer,
    audienceMatch: !contract || state.audience === contract.audience,
    clientMatch: !contract || state.clientId === contract.clientId,
    unexpired: Boolean(state.expiresAt && Number.isFinite(Date.parse(state.expiresAt)) && Date.parse(state.expiresAt) > Date.now()),
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

  const sessionHealth = evaluateSession(state, context, block.sessionContract);
  const checks = conformanceChecks(state, context, requiredCapabilities, block.sessionContract);
  if (sessionHealth.status !== 'healthy' || !checks.capabilities) {
    await revoke();
    onHealth({
      status: sessionHealth.status !== 'healthy' ? sessionHealth.status : 'unavailable',
      detail: sessionHealth.status !== 'healthy' ? sessionHealth.detail : 'session lacks required capability',
      authenticated: state.authenticated,
      principalMatches: checks.principalMatch,
      tenantMatches: checks.tenantMatch,
      workspaceMatches: checks.workspaceMatch,
      issuerMatches: checks.issuerMatch,
      audienceMatches: checks.audienceMatch,
      clientMatches: checks.clientMatch,
      unexpired: checks.unexpired,
      capabilitiesMatch: checks.capabilities,
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
  onHealth({
    ...health,
    authenticated: true,
    principalMatches: true,
    tenantMatches: true,
    workspaceMatches: true,
    issuerMatches: checks.issuerMatch,
    audienceMatches: checks.audienceMatch,
    clientMatches: checks.clientMatch,
    unexpired: checks.unexpired,
    capabilitiesMatch: checks.capabilities,
  });
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
      await cleanupMountedBlock(target, unmount);
    } finally {
      await revoke();
    }
  };
}
