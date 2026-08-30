-- Authored clean-install and isolation test for a disposable PostgreSQL 15+ database.
-- NOT RUN in AM-033: database and executable checks are held by the controlling packet.
-- Run only as a non-superuser, non-BYPASSRLS role that owns the disposable database.

\set ON_ERROR_STOP on
\ir ../../migrations/actionist-host/0001_platform_spine.sql

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = current_user
      AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'clean-install-test must not run as superuser or BYPASSRLS';
  END IF;
END;
$$;

-- Tenant A fixtures.
SELECT set_config('actionist.user_id', '00000000-0000-0000-0000-000000000001', true);
SELECT set_config('actionist.tenant_id', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('actionist.workspace_id', '00000000-0000-0000-0000-000000000201', true);
SELECT set_config('actionist.session_id', '00000000-0000-0000-0000-000000000301', true);

INSERT INTO actionist_host.users (id, email, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner-a@example.test', 'Owner A');

INSERT INTO actionist_host.user_identities (id, user_id, provider, provider_subject)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'better-auth',
  'subject-a'
);

INSERT INTO actionist_host.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000101', 'Tenant A');

INSERT INTO actionist_host.tenant_memberships (tenant_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'owner'
);

INSERT INTO actionist_host.workspaces (id, tenant_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'Workspace A'
);

INSERT INTO actionist_host.workspace_memberships (tenant_id, workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  'owner'
);

INSERT INTO actionist_host.sessions (
  id, user_id, tenant_id, workspace_id, secret_hash, expires_at
)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  'sha256:test-fixture-not-a-raw-secret',
  transaction_timestamp() + interval '1 hour'
);

INSERT INTO actionist_host.billing_accounts (
  id, tenant_id, provider, provider_account_ref, status
)
VALUES (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000101',
  'stripe',
  'cus_fixture_a',
  'active'
);

INSERT INTO actionist_host.billing_events (
  id, tenant_id, provider, provider_event_id, event_type, payload_sha256, event_created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000611',
  '00000000-0000-0000-0000-000000000101',
  'stripe',
  'evt_fixture_a',
  'customer.subscription.updated',
  repeat('a', 64),
  transaction_timestamp()
);

INSERT INTO actionist_host.entitlement_grants (
  id, tenant_id, workspace_id, feature_key, effect, source, source_ref, starts_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000101',
    NULL,
    'knowledge.edit',
    'allow',
    'stripe',
    'subscription_item_fixture_a',
    transaction_timestamp() - interval '1 minute'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000201',
    'knowledge.share',
    'deny',
    'manual',
    'support_hold_fixture_a',
    transaction_timestamp() - interval '1 minute'
  );

INSERT INTO actionist_host.audit_entries (
  id, tenant_id, workspace_id, actor_user_id, session_id,
  action, resource_type, resource_id, correlation_id, metadata
)
VALUES (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301',
  'workspace.created',
  'workspace',
  '00000000-0000-0000-0000-000000000201',
  'clean-install-a',
  '{"fixture":true}'::jsonb
);

-- Tenant B fixtures.
SELECT set_config('actionist.user_id', '00000000-0000-0000-0000-000000000002', true);
SELECT set_config('actionist.tenant_id', '00000000-0000-0000-0000-000000000102', true);
SELECT set_config('actionist.workspace_id', '00000000-0000-0000-0000-000000000202', true);
SELECT set_config('actionist.session_id', '00000000-0000-0000-0000-000000000302', true);

INSERT INTO actionist_host.users (id, email, display_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'owner-b@example.test', 'Owner B');

INSERT INTO actionist_host.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000102', 'Tenant B');

INSERT INTO actionist_host.tenant_memberships (tenant_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000002',
  'owner'
);

INSERT INTO actionist_host.workspaces (id, tenant_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000102',
  'Workspace B'
);

INSERT INTO actionist_host.workspace_memberships (tenant_id, workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000002',
  'owner'
);

INSERT INTO actionist_host.sessions (id, user_id, tenant_id, workspace_id, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000202',
  transaction_timestamp() + interval '1 hour'
);

INSERT INTO actionist_host.entitlement_grants (
  id, tenant_id, workspace_id, feature_key, effect, source, source_ref, starts_at
)
VALUES (
  '00000000-0000-0000-0000-000000000403',
  '00000000-0000-0000-0000-000000000102',
  NULL,
  'knowledge.edit',
  'allow',
  'stripe',
  'subscription_item_fixture_b',
  transaction_timestamp() - interval '1 minute'
);

-- Tenant A can read its own rows and cannot observe Tenant B.
SELECT set_config('actionist.user_id', '00000000-0000-0000-0000-000000000001', true);
SELECT set_config('actionist.tenant_id', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('actionist.workspace_id', '00000000-0000-0000-0000-000000000201', true);
SELECT set_config('actionist.session_id', '00000000-0000-0000-0000-000000000301', true);

DO $$
DECLARE
  own_tenants integer;
  foreign_tenants integer;
  own_workspaces integer;
  foreign_workspaces integer;
  visible_entitlements integer;
  foreign_sessions integer;
BEGIN
  SELECT count(*) INTO own_tenants
  FROM actionist_host.tenants
  WHERE id = '00000000-0000-0000-0000-000000000101';

  SELECT count(*) INTO foreign_tenants
  FROM actionist_host.tenants
  WHERE id = '00000000-0000-0000-0000-000000000102';

  SELECT count(*) INTO own_workspaces
  FROM actionist_host.workspaces
  WHERE id = '00000000-0000-0000-0000-000000000201';

  SELECT count(*) INTO foreign_workspaces
  FROM actionist_host.workspaces
  WHERE id = '00000000-0000-0000-0000-000000000202';

  SELECT count(*) INTO visible_entitlements
  FROM actionist_host.entitlement_grants;

  SELECT count(*) INTO foreign_sessions
  FROM actionist_host.sessions
  WHERE id = '00000000-0000-0000-0000-000000000302';

  IF own_tenants <> 1 OR own_workspaces <> 1 OR visible_entitlements <> 2 THEN
    RAISE EXCEPTION 'own-scope rows were not visible';
  END IF;
  IF foreign_tenants <> 0 OR foreign_workspaces <> 0 OR foreign_sessions <> 0 THEN
    RAISE EXCEPTION 'cross-tenant rows leaked through RLS';
  END IF;
END;
$$;

-- Missing scope settings expose no tenant rows.
SELECT set_config('actionist.tenant_id', '', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM actionist_host.tenants) <> 0 THEN
    RAISE EXCEPTION 'missing tenant setting did not fail closed';
  END IF;
END;
$$;

-- A policy-valid but incoherent membership is rejected by the composite FK.
SELECT set_config('actionist.user_id', '00000000-0000-0000-0000-000000000002', true);
SELECT set_config('actionist.tenant_id', '00000000-0000-0000-0000-000000000101', true);
SELECT set_config('actionist.workspace_id', '00000000-0000-0000-0000-000000000201', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO actionist_host.workspace_memberships (tenant_id, workspace_id, user_id, role)
    VALUES (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000002',
      'member'
    );
    RAISE EXCEPTION 'expected composite tenant membership FK rejection';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

-- RLS rejects a write to an unselected tenant.
SELECT set_config('actionist.user_id', '00000000-0000-0000-0000-000000000001', true);
SELECT set_config('actionist.tenant_id', '00000000-0000-0000-0000-000000000101', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO actionist_host.tenants (id, name)
    VALUES ('00000000-0000-0000-0000-000000000199', 'Wrong selected tenant');
    RAISE EXCEPTION 'expected RLS write rejection';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Provider events are idempotent by provider event id.
DO $$
BEGIN
  BEGIN
    INSERT INTO actionist_host.billing_events (
      id, tenant_id, provider, provider_event_id, event_type, payload_sha256, event_created_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000612',
      '00000000-0000-0000-0000-000000000101',
      'stripe',
      'evt_fixture_a',
      'customer.subscription.updated',
      repeat('b', 64),
      transaction_timestamp()
    );
    RAISE EXCEPTION 'expected duplicate provider event rejection';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
END;
$$;

-- Audit rows are append-only.
SELECT set_config('actionist.workspace_id', '00000000-0000-0000-0000-000000000201', true);
DO $$
BEGIN
  BEGIN
    UPDATE actionist_host.audit_entries
    SET metadata = '{"mutated":true}'::jsonb
    WHERE id = '00000000-0000-0000-0000-000000000501';
    RAISE EXCEPTION 'expected append-only audit rejection';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;
END;
$$;

ROLLBACK;

\echo 'SOURCE CONTRACT: clean-install, constraints, RLS, idempotency and audit immutability checks completed'
