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

Open `/w/demo`. The Fixture block mounts locally. AFFiNE remains an adapter: set `VITE_AFFINE_MODULE_URL` to a compiled module URL and provide its backend binding before it becomes available.

## Deliberate non-goals

This fixture does not include production authentication, a database or ORM, queues, global search, notification infrastructure, a secrets manager, deployment, or long-lived services. The current session and identity issuer are fixture-only. New platform surface should be added only when a measured product workflow requires it.
