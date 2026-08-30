# Base Platform local-development contract

Status: source contract only. No package manager, test, typecheck, build, database, service, or browser command was run for AM-033.

This contract describes how a later authorized operator can exercise the Base-owned persistence and entitlement slice without changing provider decisions or mistaking fixtures for runtime evidence. The source slice adds no dependency and does not alter a manifest or lockfile.

## Prerequisites

- PostgreSQL 15 or later. The migration uses `NULLS NOT DISTINCT` on a unique index.
- `psql` with `ON_ERROR_STOP` support.
- A new disposable database owned by a role that is neither superuser nor `BYPASSRLS`.
- Separate secret references for the migration and application database credentials. Credentials must not be committed, printed, or placed in evidence.
- An explicit later execution authorization. This lane did not create a database or run either SQL file.

The migration deliberately does not create roles, databases, extensions, or grants. Those are deployment concerns and vary by host. A local operator must provision the disposable database and owner role outside this repository.

## Authored commands — not run

Apply the migration to a new database:

```sh
psql "$ACTIONIST_PLATFORM_DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file migrations/actionist-host/0001_platform_spine.sql
```

Run the clean-install contract against a different, empty disposable database. The script applies the migration itself:

```sh
psql "$ACTIONIST_PLATFORM_CLEAN_DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file scripts/platform/clean-install-test.sql
```

These are future operator instructions, not an execution receipt. AM-033 records both as `NOT_RUN_DATABASE_HELD`.

## Request transaction contract

Every Platform persistence read must run inside a transaction and set scope with transaction-local PostgreSQL settings before querying RLS-protected tables:

```sql
BEGIN;
SELECT set_config('actionist.user_id',      :user_id,      true);
SELECT set_config('actionist.tenant_id',    :tenant_id,    true);
SELECT set_config('actionist.workspace_id', :workspace_id, true);
SELECT set_config('actionist.session_id',   :session_id,   true);
-- Parameterized PlatformStore queries only.
COMMIT;
```

The final argument must remain `true`; connection-pool session-global settings can leak scope between requests. Invalid or absent settings resolve to `NULL`, and the policies return no rows. Application code must never concatenate identifiers into SQL.

The future Postgres adapter must map one Base redacted session readback to one transaction. It must not receive or log a raw access assertion, cookie, credential, authorization header, provider secret, or raw session secret. `sessions.secret_hash`, when used, is a one-way verifier and is excluded from public ports.

## Local truth states

All Platform-facing UI and host facts carry one of these states:

- `fixture`: static or in-memory demonstration data.
- `configured-unverified`: configuration exists but no admitted runtime observation exists.
- `observed`: an admitted runtime observer verified the provider-backed read. This state cannot be claimed by configuration alone.
- `unavailable`: facts are missing, incoherent, or unreadable.

`PlatformSpine` returns ineligible unless the store reports `observed`. The current AM-033 slice is source-only and therefore has no observed runtime state.

## Clean-install assertions authored

The SQL contract in `scripts/platform/clean-install-test.sql` is designed to check, on an empty PostgreSQL 15+ database:

1. migration application without extensions or external services;
2. coherent user, identity, tenant, membership, workspace, session, billing, entitlement, and audit inserts;
3. own-scope visibility and cross-tenant invisibility under forced RLS;
4. fail-closed reads when transaction scope is missing;
5. composite tenant/workspace membership foreign-key enforcement;
6. RLS rejection for an unselected tenant write;
7. billing-provider event idempotency; and
8. append-only audit enforcement.

The TypeScript contract in `src/platform/spine.test.ts` is designed to check session mismatch/revocation/expiry/logout failure, evidence-state failure, entitlement precedence, malformed grant failure, and provider-error redaction.

Neither test was executed. No pass, clean-install success, runtime readiness, qualification, or admission is claimed.

## Replacement seams

Local infrastructure must implement the same repository-level interfaces, not enter Base host authority code:

- authentication provider → Base-owned authenticator plus a future Platform identity/session persistence adapter;
- PostgreSQL driver/ORM → `PlatformStore`;
- Stripe or another billing provider → provider event adapter that writes the idempotency ledger and entitlement grants;
- account/workspace/billing presentation → `PlatformReadPort`;
- host eligibility check → `PlatformAccessFactsPort`.

Provider choices and licence/self-hosting evidence are in `ADR-MATRIX.json`. The absence of a provider adapter in this bounded slice is intentional and must remain visible as `configured-unverified` or `unavailable`.
