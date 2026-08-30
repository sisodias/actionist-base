# Super SaaS Platform integration guide

Status: bounded source handoff. The Platform files are not wired into retained Base or UX paths, and no executable validation was permitted for AM-033.

## Ownership boundary

| Owner | Owns | Must not duplicate |
| --- | --- | --- |
| BASE-SAAS-SOL | login, authentication outcome, host session lifecycle, selected tenant/workspace, audience/client/capability policy, registry, routes, navigation, assertion handling, donor semantic readback | Platform SQL, migrations, provider adapters, billing-event projection, entitlement persistence/resolution |
| BASE-PLATFORM-SOL | provider-neutral records/ports, Postgres migration and RLS contract, persistent eligibility facts, entitlements, provider/default ADRs, recovery contracts | login, `BaseSessionAuthority`, `HostSessionReadback`, scope selection, capability grants, assertions, routes, registry, donor mount |
| BASE-UX-SHELL-SOL | shell composition and truth-labelled account/workspace/billing/entitlement presentation | authority decisions, provider mutation, invented runtime or billing state |

The coordination receipts report no path overlap. Any edit that wires Platform into an existing Base or UX file requires that owner’s amendment; AM-033 does not authorize it.

## Public source seam

Consumers use `src/platform/index.ts` only:

```ts
import {
  PlatformSpine,
  type PlatformAccessFactsPort,
  type PlatformAccessFactsRequest,
  type PlatformReadPort,
} from './platform';
```

`PlatformStore` and `PlatformClock` are injected implementation seams. Base must not import SQL/migration details or treat `PlatformStore` as an authority API.

The Base-to-Platform mapping is exact:

| Base redacted readback | Platform request |
| --- | --- |
| `session_id` | `sessionId` |
| `principal_id` | `principalId` |
| `tenant_id` | `tenantId` |
| `workspace_id` | `workspaceId` |

Do not pass the Base assertion, token, cookie, credential, authorization header, secret hash, or provider secret.

## Access-decision composition

```text
Base active session + selected scope + audience/client policy
                         |
                         v
       PlatformAccessFactsPort.readAccessFacts
                         |
            observed coherent persistence facts
            + provider-neutral entitlements
                         |
                         v
      Base capability policy makes the final decision
```

Rules:

1. Base rejects a missing, expired, revoked, logged-out, scope-mismatched, audience-mismatched, client-mismatched, or capability-missing session before issue or mount.
2. Platform independently fails closed on unavailable/unobserved evidence, incoherent durable session linkage, inactive membership, or malformed entitlement data.
3. Either denial wins.
4. An enabled entitlement is necessary data only where a registered capability is paywalled. It never creates or widens a Base capability.
5. An absent entitlement key is disabled.

`PlatformSpine` does not create, revoke, or log out a host session. Base revocation/logout is immediately authoritative even if a future persistence write fails. Persisted `revoked_at` or `logged_out_at` is an additional denial fact; the idempotent mutation/reconciliation adapter remains future work.

## Entitlement rules

The source resolver accepts active grants for the selected tenant and either tenant scope or the exact selected workspace. For each feature:

1. workspace scope outranks tenant scope;
2. `deny` outranks `allow` at equal scope;
3. the newest `updatedAt` wins after scope/effect;
4. lexical grant ID is the stable final tie-break;
5. malformed relevant timestamps make the whole read ineligible rather than risking a stale allow.

Stripe is the default future billing provider. Its webhook adapter belongs under Platform ownership and must verify signatures before any write, insert each provider event once, and project provider-neutral grants transactionally. This slice includes only the event/idempotency and grant schema; it has no webhook listener or Stripe SDK.

## Postgres adapter contract

The future adapter implements `PlatformStore` over `actionist_host`. Every read uses one transaction with parameterized, transaction-local settings:

```sql
SELECT set_config('actionist.user_id',      $1, true);
SELECT set_config('actionist.tenant_id',    $2, true);
SELECT set_config('actionist.workspace_id', $3, true);
SELECT set_config('actionist.session_id',   $4, true);
```

Never set these values globally on a pooled connection. Missing or invalid values become `NULL`, and policies expose no rows. The application role must not be superuser or `BYPASSRLS`.

The migration stores nonblank opaque IDs supplied by Base/adapters and needs no PostgreSQL extension. The `opaque_id` domain matches Base's no-slash/no-dot-segment identity rule instead of narrowing valid Base IDs to UUIDs. Composite foreign keys prevent a workspace member, session, or audit actor from crossing tenant boundaries. The schema stores an optional one-way `secret_hash`, never a raw session secret. Billing events retain a payload SHA-256, not the provider payload body. Audit entries reject update/delete.

## UX read contract

`PlatformReadPort` exposes:

- `readAccount(userId)`;
- `listWorkspaces(userId)`;
- `readBilling(tenantId)`; and
- `readEntitlements(scope)`.

Every returned model carries `fixture`, `configured-unverified`, `observed`, or `unavailable`. UX must render those states honestly and must not translate `configured-unverified` into connected, paid, active, durable, or production-ready language.

AM-033 implements only the access-facts spine. A provider-backed `PlatformReadPort` adapter is a later Platform change and must preserve these public model shapes.

## Replaceable defaults

The source-backed selections are recorded in `ADR-MATRIX.json`:

- Better Auth adapter behind Base authority;
- PostgreSQL with raw SQL migration and native RLS, with Drizzle as a future typed-query default;
- Stripe events projected into Base-owned entitlement grants;
- S3-compatible storage with SeaweedFS as the self-hosted default;
- SMTP with MailDev for local capture only;
- pg-boss for a future Postgres-backed job adapter;
- append-only PostgreSQL audit;
- Base-owned flags with Flagsmith as an external alternative;
- OpenTelemetry Collector plus Prometheus;
- typed environment parsing plus secret-manager references;
- Kamal as the replaceable deploy reference; and
- PostgreSQL base backup/WAL plus logical portability dumps, with tool selection still open.

Provider licence, maturity, hosting implications, alternatives, and evidence hashes remain in that matrix; do not copy them into implementation comments as mutable claims.

## Handoff state

- exact bounded path census: `BOUNDED-SLICE-CENSUS.json`;
- existing machinery audit: `EXISTING-MACHINERY-AUDIT.json`;
- decisions: `ADR-MATRIX.json`;
- clean-install operator contract: `LOCAL-DEV-CONTRACT.md`;
- deployment and recovery contract: `DEPLOY-BACKUP-RESTORE-CONTRACT.md`;
- authored TypeScript and SQL tests: **not run**;
- runtime, provider, migration, RLS, clean-install, backup, restore, and deploy evidence: **absent / held**;
- qualification and admission: **not claimed**.
