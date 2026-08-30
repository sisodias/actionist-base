import { describe, expect, it } from 'vitest';
import {
  AFFINE_ACCESS_WIRE_SCHEMA,
  compareSemanticReadback,
  serializeHostFailureEnvelope,
  type HostAccessReadback,
  type HostSessionReadback,
} from '../host';
import {
  AFFINE_E2E_NEGATIVE_FIXTURE_ID,
  createAffineE2ENegativeFixture,
  createHostDenialFixture,
  type AffineE2ENegativeMutation,
} from './affine-e2e-negative-fixture';

const source: HostAccessReadback = {
  authenticated: true,
  assertionPresent: true,
  issuer: 'actionist-base',
  audience: 'actionist/affine-workspace',
  clientId: 'bykonz-yard',
  sessionId: 'session-a',
  accessId: 'access-a',
  principalId: 'principal',
  principalKind: 'employee',
  tenantId: 'tenant',
  workspaceId: 'workspace',
  capabilities: ['knowledge.edit', 'knowledge.view'],
  issuedAt: '2026-08-30T10:00:01.000Z',
  expiresAt: '2026-08-30T10:01:00.000Z',
  correlationId: 'correlation-a',
};

const session: HostSessionReadback = {
  status: 'active',
  authenticated: true,
  issuer: source.issuer,
  sessionId: source.sessionId,
  principalId: source.principalId,
  principalKind: source.principalKind,
  tenantId: source.tenantId,
  workspaceId: source.workspaceId,
  capabilities: [...source.capabilities],
  issuedAt: '2026-08-30T10:00:00.000Z',
  expiresAt: '2026-08-30T10:02:00.000Z',
};

describe('credentialless AFFiNE E2E negative fixtures', () => {
  it('produces only redacted donor mutations with their stable semantic reason', () => {
    const cases: AffineE2ENegativeMutation[] = [
      {kind:'unauthenticated'},
      {kind:'issuer_mismatch',issuer:'other-issuer'},
      {kind:'audience_mismatch',audience:'other-audience'},
      {kind:'client_mismatch',clientId:'other-client'},
      {kind:'principal_mismatch',principalId:'other-principal'},
      {kind:'tenant_scope_mismatch',tenantId:'other-tenant'},
      {kind:'workspace_scope_mismatch',workspaceId:'other-workspace'},
      {kind:'capability_denied',capabilities:['knowledge.view']},
      {kind:'expired',expiresAt:'2026-08-30T10:00:02.000Z',comparisonNow:Date.parse('2026-08-30T10:00:03.000Z')},
      {kind:'access_replay_denied',sessionId:'session-b',accessId:'access-b',correlationId:'correlation-b'},
    ];
    for (const mutation of cases) {
      const fixture = createAffineE2ENegativeFixture(AFFINE_E2E_NEGATIVE_FIXTURE_ID, source, mutation);
      const health = compareSemanticReadback(
        source,
        fixture.readback,
        session,
        fixture.comparisonNow ?? Date.parse('2026-08-30T10:00:03.000Z'),
      );
      expect(health).toMatchObject({status:'unavailable',reasonCode:fixture.expectedReasonCode});
      expect(fixture.readback).not.toHaveProperty('assertion');
      expect(fixture.readback).not.toHaveProperty('token');
      expect(fixture.readback).not.toHaveProperty('cookie');
    }
  });

  it('emits a closed host-denial envelope without assertion or donor activity', () => {
    const failure = createHostDenialFixture(AFFINE_E2E_NEGATIVE_FIXTURE_ID, {
      stage:'issue',
      reasonCode:'capability_denied',
      sessionStatus:'active',
      correlationId:'correlation-a',
      missingCapabilities:['knowledge.edit'],
    });
    expect(serializeHostFailureEnvelope(failure)).toEqual({
      schema_version:AFFINE_ACCESS_WIRE_SCHEMA,
      ok:false,
      stage:'issue',
      reason_code:'capability_denied',
      session_status:'active',
      correlation_id:'correlation-a',
      retryable:false,
      assertion_present:false,
      mount_started:false,
      donor_request_started:false,
      missing_capabilities:['knowledge.edit'],
    });
  });

  it('cannot activate through an undeclared fixture id or a no-op mutation', () => {
    expect(() => createAffineE2ENegativeFixture('production', source, {kind:'issuer_mismatch',issuer:'other'})).toThrow('not enabled');
    expect(() => createAffineE2ENegativeFixture(AFFINE_E2E_NEGATIVE_FIXTURE_ID, source, {kind:'issuer_mismatch',issuer:source.issuer})).toThrow('must differ');
    expect(() => createHostDenialFixture(AFFINE_E2E_NEGATIVE_FIXTURE_ID, {stage:'issue',reasonCode:'capability_denied',sessionStatus:'active',correlationId:'c'})).toThrow('requires missing capabilities');
  });
});
