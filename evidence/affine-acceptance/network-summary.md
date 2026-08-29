# Browser/network receipt

Positive session: `affine-positive-final-20260829`.

The final positive reload/reopen was run after the portable, cookie-free artifact rebuild.

- Issuer context requests: 200 during valid mount/readback.
- Donor backend auth-session, GraphQL, document reads and auth-methods requests: 200 during the valid workflow.
- All observed API traffic used the host prefixes `/knowledge-issuer` and `/knowledge-backend`; document reads included `/knowledge-backend/api/workspaces/knowledge-local-workspace/docs/...`.
- The nbstore worker loaded from `/knowledge-module/js/nbstore-0.27.0.worker.js`; a direct asset probe returned 200.
- 30 captured font requests all returned 200 under `/knowledge-module/fonts/`; no root `/fonts/` request was observed in the final run.
- The page and worker backend rewrite markers are present in the compiled artifact. A worker-only request/response trace is not exposed by the browser CLI and remains explicitly held.

No raw request headers, cookies, tokens or response bodies are retained here.
