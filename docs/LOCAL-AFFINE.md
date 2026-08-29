# Local AFFiNE integration

Actionist Base can mount the existing compiled SISO Knowledge/AFFiNE package without copying donor assets into this repository.

## Required local services

The current development binding expects:

- compiled module assets: `http://127.0.0.1:4601`
- donor backend: `http://127.0.0.1:3012`
- disposable signed-context issuer: `http://127.0.0.1:4320`
- Actionist Base: `http://127.0.0.1:4179`

Vite proxies these behind same-origin paths:

- `/knowledge-module`
- `/knowledge-backend`
- `/knowledge-issuer`

Open:

`http://127.0.0.1:4179/w/knowledge-local-workspace/knowledge`

## Contract

The host fetches a short-lived signed context from the issuer, validates client and expiry, then passes:

- AFFiNE identity and workspace;
- the `knowledge` Postgres/Redis/blob ownership descriptors;
- the signed context token;
- the backend base URL;
- the initial workspace route.

This is a local conformance binding. It is not production authentication, deployment configuration, or block admission.
