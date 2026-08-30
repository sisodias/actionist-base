import type {
  DonorSemanticReadback,
  HostAccessReadback,
  HostFailureEnvelope,
  HostFailureReasonCode,
  HostSessionReadback,
} from '../host';

export const AFFINE_E2E_NEGATIVE_FIXTURE_ID = 'actionist.base.affine-e2e-negative.v1' as const;

export type AffineE2ENegativeMutation =
  | { kind: 'unauthenticated' }
  | { kind: 'issuer_mismatch'; issuer: string }
  | { kind: 'audience_mismatch'; audience: string }
  | { kind: 'client_mismatch'; clientId: string }
  | { kind: 'principal_mismatch'; principalId: string }
  | { kind: 'tenant_scope_mismatch'; tenantId: string }
  | { kind: 'workspace_scope_mismatch'; workspaceId: string }
  | { kind: 'capability_denied'; capabilities: readonly string[] }
  | { kind: 'expired'; expiresAt: string; comparisonNow: number }
  | { kind: 'access_replay_denied'; sessionId: string; accessId: string; correlationId: string };

export type AffineE2ENegativeFixture = {
  fixtureId: typeof AFFINE_E2E_NEGATIVE_FIXTURE_ID;
  expectedReasonCode: HostFailureReasonCode;
  readback: DonorSemanticReadback;
  comparisonNow?: number;
};

export function createAffineE2ENegativeFixture(
  fixtureId: string,
  source: HostAccessReadback,
  mutation: AffineE2ENegativeMutation,
): AffineE2ENegativeFixture {
  assertFixtureId(fixtureId);
  const readback: DonorSemanticReadback = {
    authenticated: true,
    issuer: source.issuer,
    audience: source.audience,
    clientId: source.clientId,
    sessionId: source.sessionId,
    accessId: source.accessId,
    principalId: source.principalId,
    tenantId: source.tenantId,
    workspaceId: source.workspaceId,
    capabilities: [...source.capabilities],
    issuedAt: source.issuedAt,
    expiresAt: source.expiresAt,
    correlationId: source.correlationId,
  };
  let expectedReasonCode: HostFailureReasonCode = 'semantic_readback_unavailable';
  let comparisonNow: number | undefined;
  switch (mutation.kind) {
    case 'unauthenticated':
      readback.authenticated = false;
      expectedReasonCode = 'semantic_readback_unavailable';
      break;
    case 'issuer_mismatch':
      readback.issuer = differentValue('issuer', source.issuer, mutation.issuer);
      expectedReasonCode = mutation.kind;
      break;
    case 'audience_mismatch':
      readback.audience = differentValue('audience', source.audience, mutation.audience);
      expectedReasonCode = mutation.kind;
      break;
    case 'client_mismatch':
      readback.clientId = differentValue('client', source.clientId, mutation.clientId);
      expectedReasonCode = mutation.kind;
      break;
    case 'principal_mismatch':
      readback.principalId = differentValue('principal', source.principalId, mutation.principalId);
      expectedReasonCode = 'semantic_readback_unavailable';
      break;
    case 'tenant_scope_mismatch':
      readback.tenantId = differentValue('tenant', source.tenantId, mutation.tenantId);
      expectedReasonCode = mutation.kind;
      break;
    case 'workspace_scope_mismatch':
      readback.workspaceId = differentValue('workspace', source.workspaceId, mutation.workspaceId);
      expectedReasonCode = mutation.kind;
      break;
    case 'capability_denied': {
      const capabilities = normalizeCapabilities(mutation.capabilities);
      if (sameCapabilities(source.capabilities, capabilities)) throw new Error('negative capability fixture must differ from Base access');
      readback.capabilities = capabilities;
      expectedReasonCode = mutation.kind;
      break;
    }
    case 'expired': {
      const expiresAt = Date.parse(mutation.expiresAt);
      if (!Number.isFinite(expiresAt) || !Number.isFinite(mutation.comparisonNow) || expiresAt > mutation.comparisonNow) {
        throw new Error('negative expiry fixture must be finite and expired at comparison time');
      }
      readback.expiresAt = mutation.expiresAt;
      comparisonNow = mutation.comparisonNow;
      expectedReasonCode = 'semantic_readback_unavailable';
      break;
    }
    case 'access_replay_denied':
      if (
        mutation.sessionId === source.sessionId
        && mutation.accessId === source.accessId
        && mutation.correlationId === source.correlationId
      ) {
        throw new Error('negative replay fixture must differ from Base access');
      }
      readback.sessionId = mutation.sessionId;
      readback.accessId = mutation.accessId;
      readback.correlationId = mutation.correlationId;
      expectedReasonCode = mutation.kind;
      break;
  }
  return {
    fixtureId: AFFINE_E2E_NEGATIVE_FIXTURE_ID,
    expectedReasonCode,
    readback,
    ...(comparisonNow === undefined ? {} : { comparisonNow }),
  };
}

export type HostDenialFixtureInput = {
  stage: 'inspect' | 'selection' | 'issue' | 'route' | 'mount';
  reasonCode: HostFailureReasonCode;
  sessionStatus: HostSessionReadback['status'];
  correlationId: string;
  retryable?: boolean;
  missingCapabilities?: readonly string[];
};

export function createHostDenialFixture(fixtureId: string, input: HostDenialFixtureInput): HostFailureEnvelope {
  assertFixtureId(fixtureId);
  const correlationId = input.correlationId.trim();
  if (!correlationId) throw new Error('negative denial fixture correlation is required');
  const missingCapabilities = normalizeCapabilities(input.missingCapabilities ?? []);
  if (input.reasonCode === 'capability_denied' && missingCapabilities.length === 0) {
    throw new Error('negative capability denial fixture requires missing capabilities');
  }
  if (input.reasonCode !== 'capability_denied' && missingCapabilities.length > 0) {
    throw new Error('negative non-capability denial fixture cannot name missing capabilities');
  }
  return {
    ok: false,
    stage: input.stage,
    reasonCode: input.reasonCode,
    sessionStatus: input.sessionStatus,
    correlationId,
    retryable: input.retryable ?? false,
    assertionPresent: false,
    mountStarted: false,
    donorRequestStarted: false,
    missingCapabilities,
  };
}

function assertFixtureId(fixtureId: string): asserts fixtureId is typeof AFFINE_E2E_NEGATIVE_FIXTURE_ID {
  if (fixtureId !== AFFINE_E2E_NEGATIVE_FIXTURE_ID) throw new Error('AFFiNE E2E negative fixture is not enabled');
}

function differentValue(label: string, current: string, replacement: string): string {
  if (!replacement.trim() || replacement === current) throw new Error(`negative ${label} fixture must differ from Base access`);
  return replacement;
}

function normalizeCapabilities(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map((capability) => capability.trim()).filter(Boolean))].sort();
}

function sameCapabilities(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = normalizeCapabilities(left);
  return normalizedLeft.length === right.length && normalizedLeft.every((capability, index) => capability === right[index]);
}
