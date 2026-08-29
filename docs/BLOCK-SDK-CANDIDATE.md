# Internal Block SDK Candidate

This is an experimental, internal candidate extracted from the Actionist Base/AFFiNE integration. It is not a published package and does not claim universality.

## Proven by AFFiNE

- A host can keep a block adapter boundary while the donor implementation remains outside generic host code.
- A short-lived signed context can be validated for expiry, required identity fields, and workspace ownership before mount. Client/audience validation remains adapter-specific.
- Runtime data ownership is expressible as explicit Postgres, Redis, and object/blob namespace descriptors.
- The lifecycle seam is ordered: `preload → establish session → inspect session → semantic health → mount → cleanup`.
- Unavailable, error, unauthenticated, expired, wrong-workspace, and missing-capability states fail closed rather than mounting.
- A session adapter can expose establish, inspect/read-back, and revoke operations.
- Same-document donor packages need embed configuration established before donor evaluation; queryless internal navigation must retain only non-secret embed state.
- Semantic health must compare the donor backend's authenticated principal/workspace read-back with the issuer identity; a successful status code alone is insufficient.
- Page and worker/realtime transports are separate seams. A compiled worker needs its own nested backend/socket rewrite, even when the page fetch bridge is correct.
- Cleanup must await donor unmount before host DOM clearing, and must revoke/discard the session after that ordered teardown even when unmount throws.
- Browser acceptance is the evidence boundary: create/edit/reload, backend restart persistence, donor-chrome absence, and fail-closed negative paths are not inferred from unit tests or HTTP 200 responses.

## Not yet proven

- The candidate has only been exercised against the local AFFiNE fixture; it is not a production auth broker or compatibility guarantee.
- Session revocation semantics, refresh, concurrent mounts, retries, and cross-tab ownership are unverified.
- A direct browser network receipt for worker-only/realtime requests is not yet captured; the current local proof combines artifact markers with the completed workflow.
- Namespace isolation and owner enforcement are descriptors and checks, not infrastructure enforcement.
- Teable has no adapter here; connector behavior, workspace semantics, and health/read-back guarantees remain unknown.
- Capability names, error taxonomy, and mount options may need a host-specific compatibility layer.

## Exact Teable falsification questions

1. Can Teable issue a short-lived session that the host can establish, inspect/read back, and revoke without direct credential handling?
2. Does Teable expose an authenticated principal, stable workspace/base identifier, expiry, and capabilities in that read-back response?
3. What exact response proves the requested Teable workspace/base matches the Actionist `workspaceId`? Can a wrong workspace ever return HTTP success?
4. Can the adapter distinguish unavailable, authentication failure, expiry, wrong workspace, and capability denial without parsing unstable UI text?
5. Is there a documented, testable revoke or logout endpoint, and is revocation observable immediately from a second session inspection?
6. Which Teable data namespaces (database, cache, object/blob, queues) have one accountable owner, and can isolation be verified in a test tenant?
7. Can a donor login/session read-back test run non-interactively in CI, or does Teable require browser-only state that invalidates the adapter contract?
8. Which minimum capability is required for read-only mount, and does Teable return that capability explicitly?

A Teable integration should be rejected as non-conforming until these questions have concrete, repeatable answers.
