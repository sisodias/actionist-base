# AFFiNE framework closure handoff

Run: `affine-acceptance-2026-08-29-final`
Scope: Actionist Base at `/w/knowledge-local-workspace/knowledge`, compiled same-document AFFiNE/SISO Knowledge module, donor-native Knowledge backend, disposable loopback issuer.
Verdict: `PARTIAL_PASS_WITH_HELD_GATES`. The observed local browser gates pass. The reusable framework now records the proven seams. Qualification remains `NOT_QUALIFIED`; registry admission remains `NOT_ADMITTED`; release remains `DRAFT`.

## Acceptance verdict table

| Gate | Verdict | Evidence / boundary |
|---|---|---|
| Host reaches a non-root workspace route | PASS | `evidence/affine-acceptance/final-created-edited.png` |
| Same-document mount into a host-owned target; no iframe | PASS | `final-backend-restart-persisted.yml`; positive DOM contract in `acceptance.json` |
| Valid issuer context/read-back | PASS | positive browser issuer 200; semantic client/principal/workspace/expiry/capability checks |
| Semantic backend health | PASS | backend auth session + GraphQL current user/workspace read-back matched issuer identity; host health `healthy` |
| Create/edit/save unique document | PASS | `final-created-edited.png`; title `Actionist AFFiNE Acceptance final 2026-08-29 2253` |
| Browser reload/find/reopen | PASS | `reloaded-found.png`; editor DOM values matched title/body |
| Backend restart then reload/find/reopen | PASS | wrapper 95831 → wrapper 50454/listener 50486; `final-backend-restart-persisted.png` and `.yml` |
| Page backend/API path | PASS | positive network summary: issuer/backend/GraphQL/document requests under host prefixes returned 200 |
| Worker asset and rewrite | PASS_WITH_HOLD | worker asset 200 and runtime markers present; direct worker-only request trace remains held |
| Positive browser console | PASS | fresh positive context: 0 errors, 0 warnings; React DevTools info only |
| Donor chrome/login absent | PASS | positive, wrong-workspace, and revoked DOM snapshots contain no donor sign-in/marketing/download surface |
| Wrong workspace | PASS | fresh context rendered `Workspace denied`, made no API request, 0 console errors/warnings |
| Missing host session | PASS | issuer session/context and donor auth-method probes returned 401 |
| Revoked host session | PASS | host Settings revoke returned Knowledge to expected 401-backed Block error; subsequent issuer/backend probes returned 401 |
| Cleanup ordering | PASS | host/SDK tests observe donor children during unmount, clear in `finally`, then revoke; no `removeChild` crash in browser teardown |
| Wrong client / expired / missing capability | PACKAGE_TESTED | Actionist package binding/unit negatives pass; browser-only variants remain held |
| Two-identity cross-workspace data isolation | HELD | no second principal/tenant run was authorized or executed |
| Rights/provenance, mobile/accessibility, upgrade, rollback, admission | HELD | outside this local runtime acceptance scope |

Machine-readable receipt: [`evidence/affine-acceptance/acceptance.json`](evidence/affine-acceptance/acceptance.json).

## Root causes and fixes

1. The first clean browser repro showed `Block error` from an expired disposable issuer identity. The issuer now gates the host cookie, mints a fresh short-lived context, and exposes an explicit revoke path. Missing and revoked sessions fail closed.
2. Donor error/marketing states exposed open-in-app/download/login chrome. The 21-file recorded adaptation patch contains the 20-file chrome/bridge set, removes the donor-local standalone bootstrap, and includes the missing leaf `siso-embed` helper. `git apply --check` passes against a clean donor checkout at the pinned head.
3. The same-document module initially stalled at `Syncing...` because generated fonts, worker API/GraphQL, and Socket.IO paths assumed root hosting. The donor package-build rewrite now passes the nested host backend to both page and worker seams and rewrites font paths.
4. The Block crash was a cleanup ownership violation: host DOM removal happened before donor React unmount. `cleanupBlockMount`, `cleanupMountedBlock`, the AFFiNE adapter unmount wrapper, and regression tests now await donor teardown before clearing and revoke afterward.
5. HTTP 200 alone was insufficient health. AFFiNE health now checks donor auth-session user id and a GraphQL workspace/current-user read-back against the issuer identity.

## Framework rules encoded

- `MAKE-A-BLOCK.md` now makes auth topology/session establishment a mandatory phase before bridge work.
- Same-document, iframe, and service shapes have separate establishment and routing rules; a same-document donor must seed non-secret embed state before donor evaluation and preserve it through queryless navigation.
- Semantic health compares authenticated read-back, principal, workspace, expiry and capability; static status and asset success are not health.
- Workers/realtime have an independent global and require an independent backend/socket rewrite; page fetch bridging is not sufficient.
- The host owns the mount target and must await donor unmount before DOM clearing and session revoke, including the throwing-unmount case.
- Browser acceptance requires real create/edit/reload, backend restart persistence, clean console, donor-login absence, and negative auth/workspace probes. Every gate gets redacted machine-readable evidence; secrets/cookies/tokens never enter receipts.
- Compound assimilation remains `reuse.shape: assimilated_package`, `mount_topology: same_document`: donor backend/schema/migrations/realtime/blob ownership is explicit and not silently transferred to the host.

## Verification commands and artifacts

Actionist Base:

```sh
npm run typecheck
npm test -- --run
npm run build
```

AFFiNE block package:

```sh
node scripts/validate.mjs
node --test tests/smoke.test.mjs
git -C <siso-knowledge> apply --check --directory=frontend <affine-workspace>/patches/0001-embed-guards.patch
```

Donor build/runtime:

```sh
node siso/package-build.mjs
node siso/issuer.mjs
corepack yarn workspace @siso/server start   # backend workspace, sharedEnv from siso/local.mjs
```

Browser contexts and URLs are recorded in `acceptance.json`; screenshots and DOM snapshots are siblings in the same evidence directory. The final compiled entry digest is `sha256:382721b5d0b92bb768e479397c6dc5d1f94d03ae72d15c7ea59ab1ee88fd971c`; its package manifest digest is `sha256:0aa36f1078128cf7bd9dbdd41ff72a7923d4b825d745e6ae2f4659ed534ca7f7`. The build recipe also normalizes checkout paths in source maps/WASM fallback metadata.

The donor working tree has two owned, uncommitted support edits required by this local proof: `siso/issuer.mjs` for host-session gating/revoke and `siso/package-build.mjs` for nested page/worker/font rewrites. The frontend guard edits were reversed after patch verification; the reusable patch is the source of those changes. The Action Model parent status also reports a dirty sibling `actionist-base-shell-worktree` with shell-extraction files; that worktree was inspected and preserved as unrelated pre-existing work. No unrelated donor files were touched.

## Remaining blockers

The block is not safe to admit or deploy. Holds are: direct worker/realtime request trace; two-identity data isolation; browser-level wrong-client/expired/missing-capability cases; rights/provenance; cross-origin theme/token parity; mobile/accessibility; donor upgrade replay; density/tenant switching; rollback rehearsal; and named human admission. The local issuer is disposable and is not a production auth broker.

## User verification status

The current terminal state is intentionally revoked after the negative gate, so
`safe_for_user_verification: false` for the current browser session. Restart only the
disposable `node siso/issuer.mjs` process to reset its in-memory fixture session; do not reset
the backend or database. The positive route and final unique document are then ready for local
verification. Do not interpret this local pass as production qualification or registry admission.
