# Proven failure trace and fixes

1. The first clean browser repro showed `Block error` because the issuer returned an expired disposable identity. The runtime now issues a fresh short-lived context per valid host session and rejects missing/revoked sessions.
2. When the donor loaded, its error/marketing path exposed open-in-app/download chrome. The recorded adaptation patch now guards those terminal paths and includes the leaf helper that the original patch forgot to ship.
3. The same-document package initially stalled in `Syncing...`: page assets/fonts and the nbstore worker still used root paths. The build rewrite now handles nested fonts, worker API/GraphQL/socket paths and host backend handoff.
4. The donor React cleanup crash was caused by the host clearing its mount target before donor unmount. Host and SDK cleanup now await donor teardown, clear the target in `finally`, and revoke after teardown.
5. A 200-only health check could accept the wrong backend principal. Semantic health now validates backend user id and GraphQL workspace id against the issuer identity.
6. The donor standalone bootstrap embedded a disposable cookie literal in the package even though compiled mode never used it. The adaptation patch removes that bootstrap from the compiled source, and the artifact rewrite normalizes checkout paths in source maps and WASM fallback metadata.
