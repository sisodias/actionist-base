# Teable SDK Handoff

## Status

**Rejected for adapter implementation; evidence-backed design only.** The Teable source exposes conventional cookie-backed sessions, user/base/permission reads, signout, and a public metadata-database health endpoint. It does not provide enough evidence for the Actionist candidate's short-lived host assertion, complete session read-back, stable capability/error taxonomy, or authenticated mount contract.

## Artifacts

- Falsification dossier: `docs/TEABLE-SDK-FALSIFICATION.md`
- Candidate seams inspected: `src/sdk/core.ts`, `src/sdk/core.test.ts`
- No `src/adapters/teable/**` implementation was added.

## Source evidence

- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/session/session-handle.service.ts:16-27` — `auth_session` express-session cookie; one-year cookie max age; Redis-backed store.
- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/auth.controller.ts:30-54` — signout, `/user/me`, `/user`, and temp-token routes.
- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/session/session.service.ts:23-34` — `req.session.destroy` revocation behavior.
- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/session/session-store.service.ts:23-41,44-72,97-103` — TTL/cache read and destroy behavior.
- `apps/SISOCRM/modules/teable/packages/openapi/src/auth/user-me.ts:6-33` — user/organization schema without expiry/capabilities.
- `apps/SISOCRM/modules/teable/packages/openapi/src/base/get.ts:21-59` — base `id`, `spaceId`, role and collaborator metadata.
- `apps/SISOCRM/modules/teable/packages/openapi/src/base/get-permission.ts:11-18` — boolean permission map.
- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/health/health.controller.ts:5-25` — public `/health`, metadata DB ping only.
- `apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/siso-host-auth.ts:21-48` and `.spec.ts:8-53` — local mocked host-session bridge; not donor assertion exchange.
- `clients/actionmodel/blocks/teable-data-grid/records/qualification.json:130-139,173-184` — independent isolation, attachment, host handoff and admission holds.

## Required next proof

Before any adapter work, add a Teable-side documented and tested host exchange that accepts a short-lived audience-bound single-use assertion, returns principal/base/workspace/expiry/read capability, rejects wrong workspace with stable semantics, and demonstrates immediate revoke from a second inspection. Separately prove attachment authorization and independent role/schema/restore isolation in CI.

## Verification

Pending parent-agent execution of the required base checks. Donor checkout was inspected read-only; its existing dirty state is unrelated and must remain unchanged.
