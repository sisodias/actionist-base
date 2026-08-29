# Teable SDK Falsification

Date: 2026-08-29

Scope: read-only inspection of the Teable block contract and the SISOCRM Teable checkout. No donor files were changed by this assessment.

## Questions and evidence

| # | Question | Finding | Evidence and status |
|---|---|---|---|
| 1 | Short-lived session establish/inspect/revoke without direct credentials? | **No: candidate mismatch.** | Teable's normal session is an `express-session` cookie named `auth_session`, with a one-year cookie maxAge (`apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/session/session-handle.service.ts:16-27`). Host-side evidence exists only as a local SISO bridge: `resolveSisoHostUser` calls a configured host URL and forwards an opaque cookie (`.../src/features/auth/siso-host-auth.ts:21-48`); this is not a Teable-issued short-lived assertion/exchange. Teable does expose signout, but it destroys the request session and clears the cookie (`.../src/features/auth/auth.controller.ts:30-35`, `.../src/features/auth/session/session.service.ts:23-34`). **Observed:** cookie session and signout. **Inferred:** no documented Teable `/internal/teable/session` assertion exchange. **Unknown:** whether a deployment-specific broker exists outside this checkout. |
| 2 | Authenticated principal, stable workspace/base identifier, expiry, capabilities in read-back? | **Needs change / not proven.** | `/api/auth/user/me` returns the authenticated user plus organization (`.../src/features/auth/auth.controller.ts:37-43`); OpenAPI schema includes user/org fields but no expiry or capabilities (`packages/openapi/src/auth/user-me.ts:6-33`). Base read-back returns `id`, `spaceId`, `role`, and collaborator metadata (`packages/openapi/src/base/get.ts:21-59`), while permission is a separate boolean map (`packages/openapi/src/base/get-permission.ts:11-18`). **Observed:** principal, base ID, space ID, role/permission endpoints. **Observed absent:** expiry/capability fields in these schemas. **Inferred:** adapter would need to compose multiple reads and define capability mapping. |
| 3 | Exact response proving requested workspace/base match; can wrong workspace return HTTP success? | **Needs change / not proven.** | `GET /base/{baseId}` is the exact base lookup and returns `id`/`spaceId` (`packages/openapi/src/base/get.ts:7-8,26-59,61-89`); the candidate block requires host-bound allowlist and verified tenant context (`blocks/teable-data-grid/records/host-requirements.json:35-41`). No inspected Teable response binds a host `workspaceId`/tenant to the base, and no negative wrong-workspace HTTP test was found in the inspected source. **Observed:** base identity and role. **Unknown:** deployment authorization behavior for a wrong but existing base; cannot claim fail-closed. |
| 4 | Stable distinction among unavailable/auth failure/expiry/wrong workspace/capability denial? | **Needs change.** | Teable uses ordinary HTTP/auth exceptions for auth paths; `validateJwtToken` catches JWT failures and throws generic `UnauthorizedException` (`apps/SISOCRM/modules/teable/apps/nestjs-backend/src/features/auth/auth.service.ts:33-38`). Base permission is a boolean record (`packages/openapi/src/base/get-permission.ts:11-18`). Candidate contract requires semantic categories (`actionist-base/src/sdk/core.ts:30-34,59-64`) but Teable has no adapter-level taxonomy or stable exchange error contract in inspected files. **Observed:** generic unauthorized and separate permission map. **Inferred:** status/error parsing alone would be unstable; normalization layer required. |
| 5 | Documented/testable revoke and immediate observability from second inspection? | **Needs change / not proven.** | `POST /api/auth/signout` is documented in OpenAPI (`packages/openapi/src/auth/signout.ts:4-19`) and calls `req.session.destroy`, then clears `auth_session` (`.../auth.controller.ts:30-35`, `.../session/session.service.ts:23-34`). Store deletion removes `auth:session-store:${sid}` (`.../session/session-store.service.ts:97-103`). **Observed:** revoke/logout implementation. **Unknown:** no inspected test proves a second inspection immediately rejects after revoke, and cookie deletion is not equivalent to revoking an assertion. |
| 6 | Namespaces and accountable owners, with test-tenant isolation verification? | **Partial declarative hold; runtime proof absent.** | Block contract declares owners: metadata `teable-prisma`, base data `teable-data-plane-migrator`, attachments `teable-storage-adapter`, host data `actionist-host` (`blocks/teable-data-grid/records/capability.json:63-76`); topology is one server/separate schemas with per-base runtime schemas (`.../records/host-requirements.json:64-72`). Qualification explicitly holds independent role/schema/restore and attachment proof (`.../records/qualification.json:130-139,173-184`). **Observed:** declared owners/topology and explicit blocked qualification. **Inferred:** descriptors do not enforce isolation. **Unknown:** test-tenant end-to-end namespace/restore proof. |
| 7 | Non-interactive CI login/session read-back? | **No evidence for candidate contract.** | Teable has automated auth e2e tests (`apps/nestjs-backend/test/auth.e2e-spec.ts:54-80` and throughout), but they exercise normal signup/signin/session routes, not host assertion exchange. The existing SISO host test uses mocked `fetch` and an opaque cookie (`.../src/features/auth/siso-host-auth.spec.ts:8-53`), so it proves only a local bridge helper. **Observed:** automated native auth tests and mocked host resolver. **Unknown:** reproducible CI test against a host-issued short-lived assertion. |
| 8 | Minimum read-only capability explicitly returned? | **No.** | Base permission endpoint returns a boolean permission record (`packages/openapi/src/base/get-permission.ts:11-18,42-48`), and base response returns role (`packages/openapi/src/base/get.ts:26-54`). The block capability record leaves `requires_capabilities` empty while describing read/write ports (`blocks/teable-data-grid/records/capability.json:20-34,50-62`). No stable Teable field explicitly names an Actionist read-only capability. **Observed:** role/permission booleans. **Inferred:** read-only authorization can be derived only through a host-defined mapping. |

## SDK seam verdicts

| Seam | Verdict | Reason |
|---|---|---|
| `SessionAdapter.establish/inspect/revoke` | **NEEDS CHANGE** | Teable has cookie-backed long-lived sessions and logout, but no proven short-lived host assertion exchange or read-back contract. |
| `SessionState` principal/workspace/expiry/capabilities | **NEEDS CHANGE** | Principal/base/role are available across responses; expiry and explicit capabilities are not in the read-back schemas. |
| `evaluateSession` wrong-workspace and expiry fail-closed | **NOT PROVEN** | Base lookup exists, but host tenant/workspace binding and wrong-workspace negative behavior are not evidenced. |
| semantic health | **NEEDS CHANGE** | `/health` is public and checks only metadata DB ping (`.../features/health/health.controller.ts:5-25`); it does not prove Redis/realtime, proxy, or attachment authorization checks required by the block. |
| required capabilities/conformance | **NEEDS CHANGE** | Teable returns role/permission data, not the candidate's stable capability IDs. |
| lifecycle ordering and cleanup | **NOT PROVEN for Teable** | Generic lifecycle is donor-independent and proven by AFFiNE tests, but Teable mount/session execution is absent. |
| namespace descriptors/one-owner check | **HOLDS as a declaration seam only** | Teable contract has explicit owners and separate schemas; runtime enforcement and restore evidence remain blocked. |
| mount seam | **NOT PROVEN** | Donor UI/runtime mount behind a host proxy is specified by the block package, but no authenticated mount or host exchange was reproduced. |

## Decision

Reject a Teable adapter implementation at this time. Source evidence supports an evidence-backed design only; implementing an adapter would force-fit a host assertion/session contract that Teable does not currently expose in the inspected source. The exact blockers are:

1. A documented Teable-side host session exchange accepting a short-lived, audience-bound, single-use assertion.
2. A stable inspected session response containing principal, base/workspace binding, expiry, and explicit read capability.
3. A reproducible wrong-workspace negative test and stable error taxonomy.
4. Immediate revocation observability from a second inspection.
5. Authenticated attachment namespace proof and independent role/schema/restore isolation proof.
6. A CI-safe, non-interactive end-to-end host handoff test.

No `src/adapters/teable/**` files were created.
