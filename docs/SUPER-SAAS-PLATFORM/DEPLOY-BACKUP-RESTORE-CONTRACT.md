# Base Platform deploy, backup, and restore contract

Status: design contract only. No image, manifest, environment, database, backup, restore, deploy, rollback, or service was created or exercised for AM-033.

Kamal is the selected replaceable deployment reference because the audited upstream is active and MIT-licensed. It is not a database backup product, and no Kamal configuration exists in this slice. PostgreSQL backup tooling remains deliberately unselected until the host, recovery objectives, encryption boundary, and object-storage target are named.

## Release input contract

A deployable release is incomplete unless one receipt binds all of the following:

- immutable application image digest;
- Git commit and tree;
- exact migration path and SHA-256;
- target environment identifier;
- configuration schema/version and non-secret configuration digest;
- secret-manager reference names and versions, never secret values;
- PostgreSQL major version and database identity;
- object-storage endpoint identity and bucket inventory version;
- pre-deploy backup or recovery-point identifier;
- migration owner and application role identities;
- release initiator, approval, start/end timestamps, and terminal state.

AM-033 supplies only source paths. It has no release receipt and is not deployable evidence.

## Database roles

Provision roles outside the migration:

- migration owner: owns schema objects; no application traffic;
- application role: scoped DML and function access; never superuser or `BYPASSRLS`;
- billing-ingest role: least-privilege writer for provider event and entitlement projection transactions;
- backup role: documented read/archive privileges only;
- restore operator: separate, audited authority for a disposable recovery target.

`FORCE ROW LEVEL SECURITY` keeps the table owner subject to policies, but PostgreSQL superusers and `BYPASSRLS` roles still bypass them. Normal application and isolation checks must never use either privilege.

## Deployment sequence

1. Freeze the immutable image, Git, configuration, and migration identities.
2. Confirm the target PostgreSQL major version is 15 or later.
3. Create and verify a recovery point under a separately admitted backup procedure.
4. Run one migration owner against one target, with lock and duration telemetry captured by the deploy system.
5. Start application instances using the least-privilege application role and transaction-local RLS settings.
6. Observe schema identity, application health, and provider adapters without logging secrets.
7. Admit or reject the release through the separate qualification authority.

The migration is forward-only. There is no down migration in this slice. Image rollback cannot undo a data/schema change. A later production migration must use expand/contract compatibility, and recovery from a destructive migration requires a proven restore or point-in-time recovery path.

## Backup sets

The minimum recovery set is larger than the application image:

| Set | Required content | Required integrity evidence |
| --- | --- | --- |
| PostgreSQL physical | base backup plus continuous WAL archive sufficient for point-in-time recovery | encrypted object identity, checksums, start/end LSN, timeline, server version, completion state |
| PostgreSQL logical | schema and data dump for portability and selective inspection | tool/server versions, command shape with secrets redacted, file checksum, table census |
| S3-compatible objects | versioned object data, delete markers, metadata, bucket policy/configuration, inventory | inventory checksum, object/version counts, encryption and replication state |
| Configuration | non-secret manifests and configuration digests | Git/tree or artifact digest |
| Secrets | secret-manager references and recovery procedure, not exported plaintext in repository evidence | reference versions, access-policy receipt, rotation owner |
| Release metadata | image, migration, config, backup, and environment bindings | signed or access-controlled release receipt |

PostgreSQL contains identity, tenancy, session facts, billing-event idempotency, entitlements, and audit entries, so all of those share the database recovery point. S3-compatible object state must be restored to a mutually consistent point or reconciled explicitly.

SeaweedFS is the selected self-hostable S3-compatible default in the ADR matrix; any replacement must preserve object versioning/inventory and recovery semantics. An S3 API alone is not evidence that backups, versioning, encryption, replication, or restore work.

## Restore procedure contract

Every restore drill must target a new isolated environment and produce a receipt containing:

1. requested recovery timestamp and reason;
2. source backup IDs, checksums, WAL range, timeline, and object inventory;
3. isolated destination database and bucket identities;
4. PostgreSQL and restore-tool versions;
5. schema migration census after recovery;
6. per-table row counts, constraint state, and RLS-policy census;
7. object counts/version counts and sampled content checksums;
8. application image/config identities used only for recovery verification;
9. redacted semantic checks for two-tenant isolation, session revocation, billing idempotency, entitlement facts, and append-only audit;
10. achieved recovery point, elapsed time, deviations, operator, reviewer, and terminal verdict.

Do not reconnect a recovered environment to live Stripe webhooks, email delivery, job runners, or object writers during verification. External side effects require explicit isolation or sink adapters.

## Objectives and admission

RPO, RTO, retention, backup frequency, geographic replication, encryption-key ownership, and backup tool are open governance inputs. They must be selected before a production deployment can be qualified. No values are inferred here.

Current evidence state:

- deploy: `NOT_RUN_HELD`;
- backup: `NOT_RUN_HELD`;
- restore: `NOT_RUN_HELD`;
- rollback: `NOT_RUN_HELD`;
- production readiness: `NOT_CLAIMED`;
- qualification/admission: `NOT_QUALIFIED` / `NOT_ADMITTED`.
