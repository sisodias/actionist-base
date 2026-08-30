# Base host contract for AFFINE-E2E-01

Status: source contract checkpoint; runtime unproven while PM compute HOLD is active.

Base remains the authority for login, session state, selected tenant/workspace, audience and client policy, capability grants, registry visibility, route resolution, and semantic acceptance. The AFFiNE adapter receives only a short-lived assertion and redacted access context. It must not receive Base login credentials or mint, widen, refresh, or persist Base authority.

## Access policy

The AFFiNE mount requires this exact policy:

- audience: `actionist/affine-workspace`
- client: `bykonz-yard`
- capabilities: exactly `knowledge.view` and `knowledge.edit`

If either capability is absent, Base denies the whole mount. This checkpoint does not define a reduced read-only mount.

Every issued access has a unique non-secret `access_id` and carries the request `correlation_id`. The raw assertion is returned only to the adapter. It is not part of session or access readback and is not retained in the Base session record.

## Wire schema

The closed wire schema identifier is `actionist.base.affine-access.v1`. TypeScript uses camel-case field names internally; JSON uses the following snake-case fields.

Session readback:

```text
schema_version, status, authenticated, issuer, session_id,
principal_id, principal_kind, tenant_id, workspace_id,
capabilities, issued_at, expires_at
```

Base access readback:

```text
schema_version, authenticated, issuer, audience, client_id,
session_id, access_id, principal_id, principal_kind, tenant_id,
workspace_id, capabilities, issued_at, expires_at,
assertion_present, correlation_id
```

Donor semantic readback:

```text
schema_version, authenticated, issuer, audience, client_id,
session_id, access_id, principal_id, tenant_id, workspace_id,
capabilities, issued_at, expires_at, correlation_id
```

Unknown schema versions or malformed required fields fail closed. The donor capability set must equal the Base-issued set after normalization; a subset or superset is denied.

## Semantic acceptance

The adapter sends the assertion on every health request with `credentials: omit`; ambient cookies are not an authentication path. After donor readback, Base re-inspects the bound session before acceptance. Success requires:

- the session is still active and matches issuer, session, principal, tenant, and workspace;
- donor issuer, audience, client, session, access, principal, tenant, workspace, and correlation match the Base-issued access;
- the timeline is ordered `session issued <= access issued <= donor issued <= now < donor expiry <= access expiry <= session expiry`;
- donor capabilities exactly equal Base-issued capabilities.

Failures use one of these closed reason codes:

```text
session_missing, session_expired, session_revoked, session_logged_out,
issuer_mismatch, audience_denied, audience_mismatch, client_denied,
client_mismatch, tenant_scope_mismatch, workspace_scope_mismatch,
capability_denied, assertion_issue_failed, semantic_readback_unavailable,
access_replay_denied
```

## Remaining source work

This checkpoint does not yet claim external assertion revocation, one-access-per-mount lifecycle tracking, or the final workspace/session-aware route guard. Those remain fail-closed integration work. No package, typecheck, test, build, service, or browser evidence exists for this checkpoint while compute is held.
