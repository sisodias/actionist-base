-- Actionist Base Platform persistence spine.
-- Source candidate only: this migration was authored under a database execution hold.
-- PostgreSQL 15+ is required for unique indexes with NULLS NOT DISTINCT.

BEGIN;

CREATE SCHEMA actionist_host;

CREATE DOMAIN actionist_host.opaque_id AS text
  CHECK (
    btrim(VALUE) <> ''
    AND VALUE NOT LIKE '%/%'
    AND VALUE NOT IN ('.', '..')
  );

CREATE FUNCTION actionist_host.setting_id(setting_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT nullif(current_setting(setting_name, true), '') $$;

CREATE FUNCTION actionist_host.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT actionist_host.setting_id('actionist.tenant_id') $$;

CREATE FUNCTION actionist_host.current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT actionist_host.setting_id('actionist.workspace_id') $$;

CREATE FUNCTION actionist_host.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT actionist_host.setting_id('actionist.user_id') $$;

CREATE FUNCTION actionist_host.current_session_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT actionist_host.setting_id('actionist.session_id') $$;

CREATE FUNCTION actionist_host.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := transaction_timestamp();
  RETURN NEW;
END;
$$;

CREATE TABLE actionist_host.users (
  id actionist_host.opaque_id PRIMARY KEY,
  email text NOT NULL CHECK (btrim(email) <> ''),
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE UNIQUE INDEX users_email_unique
  ON actionist_host.users (lower(email));

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON actionist_host.users
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.user_identities (
  id actionist_host.opaque_id PRIMARY KEY,
  user_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.users(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  provider_subject text NOT NULL CHECK (btrim(provider_subject) <> ''),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE actionist_host.tenants (
  id actionist_host.opaque_id PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE TRIGGER tenants_touch_updated_at
BEFORE UPDATE ON actionist_host.tenants
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.tenant_memberships (
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  user_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (btrim(role) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TRIGGER tenant_memberships_touch_updated_at
BEFORE UPDATE ON actionist_host.tenant_memberships
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.workspaces (
  id actionist_host.opaque_id PRIMARY KEY,
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (btrim(name) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (tenant_id, id)
);

CREATE TRIGGER workspaces_touch_updated_at
BEFORE UPDATE ON actionist_host.workspaces
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.workspace_memberships (
  tenant_id actionist_host.opaque_id NOT NULL,
  workspace_id actionist_host.opaque_id NOT NULL,
  user_id actionist_host.opaque_id NOT NULL,
  role text NOT NULL CHECK (btrim(role) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (tenant_id, workspace_id, user_id),
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES actionist_host.workspaces(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES actionist_host.tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT
);

CREATE TRIGGER workspace_memberships_touch_updated_at
BEFORE UPDATE ON actionist_host.workspace_memberships
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.sessions (
  id actionist_host.opaque_id PRIMARY KEY,
  user_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.users(id) ON DELETE RESTRICT,
  tenant_id actionist_host.opaque_id NOT NULL,
  workspace_id actionist_host.opaque_id NOT NULL,
  secret_hash text CHECK (secret_hash IS NULL OR btrim(secret_hash) <> ''),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  logged_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  CHECK (logged_out_at IS NULL OR logged_out_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES actionist_host.tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES actionist_host.workspaces(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, workspace_id, user_id)
    REFERENCES actionist_host.workspace_memberships(tenant_id, workspace_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX sessions_user_expiry_idx
  ON actionist_host.sessions (user_id, expires_at DESC);

CREATE TRIGGER sessions_touch_updated_at
BEFORE UPDATE ON actionist_host.sessions
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.billing_accounts (
  id actionist_host.opaque_id PRIMARY KEY,
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  provider_account_ref text NOT NULL CHECK (btrim(provider_account_ref) <> ''),
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled')),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (tenant_id, provider),
  UNIQUE (provider, provider_account_ref)
);

CREATE TRIGGER billing_accounts_touch_updated_at
BEFORE UPDATE ON actionist_host.billing_accounts
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.billing_events (
  id actionist_host.opaque_id PRIMARY KEY,
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  provider_event_id text NOT NULL CHECK (btrim(provider_event_id) <> ''),
  event_type text NOT NULL CHECK (btrim(event_type) <> ''),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  event_created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  processed_at timestamptz,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE actionist_host.entitlement_grants (
  id actionist_host.opaque_id PRIMARY KEY,
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  workspace_id actionist_host.opaque_id,
  feature_key text NOT NULL CHECK (btrim(feature_key) <> ''),
  effect text NOT NULL CHECK (effect IN ('allow', 'deny')),
  source text NOT NULL CHECK (btrim(source) <> ''),
  source_ref text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES actionist_host.workspaces(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX entitlement_grants_source_unique
  ON actionist_host.entitlement_grants (tenant_id, workspace_id, feature_key, source, source_ref)
  NULLS NOT DISTINCT;

CREATE INDEX entitlement_grants_resolution_idx
  ON actionist_host.entitlement_grants (tenant_id, workspace_id, feature_key, starts_at, ends_at);

CREATE TRIGGER entitlement_grants_touch_updated_at
BEFORE UPDATE ON actionist_host.entitlement_grants
FOR EACH ROW EXECUTE FUNCTION actionist_host.touch_updated_at();

CREATE TABLE actionist_host.audit_entries (
  id actionist_host.opaque_id PRIMARY KEY,
  tenant_id actionist_host.opaque_id NOT NULL REFERENCES actionist_host.tenants(id) ON DELETE RESTRICT,
  workspace_id actionist_host.opaque_id,
  actor_user_id actionist_host.opaque_id REFERENCES actionist_host.users(id) ON DELETE RESTRICT,
  session_id actionist_host.opaque_id REFERENCES actionist_host.sessions(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (btrim(action) <> ''),
  resource_type text NOT NULL CHECK (btrim(resource_type) <> ''),
  resource_id text NOT NULL CHECK (btrim(resource_id) <> ''),
  correlation_id text NOT NULL CHECK (btrim(correlation_id) <> ''),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES actionist_host.workspaces(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, actor_user_id)
    REFERENCES actionist_host.tenant_memberships(tenant_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, session_id)
    REFERENCES actionist_host.sessions(tenant_id, id) ON DELETE RESTRICT
);

CREATE FUNCTION actionist_host.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'actionist_host.audit_entries is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_entries_append_only
BEFORE UPDATE OR DELETE ON actionist_host.audit_entries
FOR EACH ROW EXECUTE FUNCTION actionist_host.reject_audit_mutation();

ALTER TABLE actionist_host.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_self ON actionist_host.users
  USING (id = actionist_host.current_user_id())
  WITH CHECK (id = actionist_host.current_user_id());

ALTER TABLE actionist_host.user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.user_identities FORCE ROW LEVEL SECURITY;
CREATE POLICY user_identities_self ON actionist_host.user_identities
  USING (user_id = actionist_host.current_user_id())
  WITH CHECK (user_id = actionist_host.current_user_id());

ALTER TABLE actionist_host.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenants_selected ON actionist_host.tenants
  USING (id = actionist_host.current_tenant_id())
  WITH CHECK (id = actionist_host.current_tenant_id());

ALTER TABLE actionist_host.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.tenant_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_memberships_selected_self ON actionist_host.tenant_memberships
  USING (
    tenant_id = actionist_host.current_tenant_id()
    AND user_id = actionist_host.current_user_id()
  )
  WITH CHECK (
    tenant_id = actionist_host.current_tenant_id()
    AND user_id = actionist_host.current_user_id()
  );

ALTER TABLE actionist_host.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY workspaces_selected_tenant ON actionist_host.workspaces
  USING (tenant_id = actionist_host.current_tenant_id())
  WITH CHECK (tenant_id = actionist_host.current_tenant_id());

ALTER TABLE actionist_host.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.workspace_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_memberships_selected_self ON actionist_host.workspace_memberships
  USING (
    tenant_id = actionist_host.current_tenant_id()
    AND user_id = actionist_host.current_user_id()
  )
  WITH CHECK (
    tenant_id = actionist_host.current_tenant_id()
    AND user_id = actionist_host.current_user_id()
  );

ALTER TABLE actionist_host.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY sessions_selected_self ON actionist_host.sessions
  USING (
    id = actionist_host.current_session_id()
    AND tenant_id = actionist_host.current_tenant_id()
    AND workspace_id = actionist_host.current_workspace_id()
    AND user_id = actionist_host.current_user_id()
  )
  WITH CHECK (
    id = actionist_host.current_session_id()
    AND tenant_id = actionist_host.current_tenant_id()
    AND workspace_id = actionist_host.current_workspace_id()
    AND user_id = actionist_host.current_user_id()
  );

ALTER TABLE actionist_host.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.billing_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_accounts_selected_tenant ON actionist_host.billing_accounts
  USING (tenant_id = actionist_host.current_tenant_id())
  WITH CHECK (tenant_id = actionist_host.current_tenant_id());

ALTER TABLE actionist_host.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.billing_events FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_events_selected_tenant ON actionist_host.billing_events
  USING (tenant_id = actionist_host.current_tenant_id())
  WITH CHECK (tenant_id = actionist_host.current_tenant_id());

ALTER TABLE actionist_host.entitlement_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.entitlement_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY entitlement_grants_selected_scope ON actionist_host.entitlement_grants
  USING (
    tenant_id = actionist_host.current_tenant_id()
    AND (workspace_id IS NULL OR workspace_id = actionist_host.current_workspace_id())
  )
  WITH CHECK (
    tenant_id = actionist_host.current_tenant_id()
    AND (workspace_id IS NULL OR workspace_id = actionist_host.current_workspace_id())
  );

ALTER TABLE actionist_host.audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE actionist_host.audit_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_entries_selected_scope ON actionist_host.audit_entries
  USING (
    tenant_id = actionist_host.current_tenant_id()
    AND (workspace_id IS NULL OR workspace_id = actionist_host.current_workspace_id())
  )
  WITH CHECK (
    tenant_id = actionist_host.current_tenant_id()
    AND (workspace_id IS NULL OR workspace_id = actionist_host.current_workspace_id())
  );

COMMENT ON SCHEMA actionist_host IS
  'Actionist Base provider-neutral persistence spine; source candidate, runtime unverified.';
COMMENT ON TABLE actionist_host.sessions IS
  'Durable session facts only. Base owns authentication, lifecycle authority, assertions and capability decisions.';
COMMENT ON COLUMN actionist_host.sessions.secret_hash IS
  'Optional one-way verifier hash. Raw session secrets must never be stored here.';
COMMENT ON TABLE actionist_host.entitlement_grants IS
  'Provider-neutral entitlement facts. A grant cannot mint or widen a Base capability.';
COMMENT ON TABLE actionist_host.billing_events IS
  'Idempotency ledger stores event identifiers and payload digests, not provider payload bodies.';

COMMIT;
