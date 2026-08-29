# Actionist Base

A narrow, runnable conformance fixture for the Actionist host/block contract. This is a standalone repository nested in the canonical Action Model workspace.

It currently proves:

- workspace-scoped routing under `/w/:workspaceId`;
- deny-by-default capability checks;
- block ID and route conflict detection;
- `preload → health → mount → unmount` lifecycle handling;
- replaceable shell rendering;
- loading, denied, unavailable and error surfaces;
- a native fixture block and an AFFiNE adapter boundary.

## Run

```sh
npm ci
npm run typecheck
npm test -- --run
npm run build
npm run dev
```

Open `/w/knowledge-local-workspace`. The Fixture block mounts locally. The Knowledge route binds the existing compiled AFFiNE package when its local module, backend, and signed-context issuer are running; see [`docs/LOCAL-AFFINE.md`](docs/LOCAL-AFFINE.md).

## Deliberate non-goals

This fixture does not include production authentication, a database or ORM, queues, global search, notification infrastructure, a secrets manager, deployment, or long-lived services. The current session and identity issuer are fixture-only. New platform surface should be added only when a measured product workflow requires it.
