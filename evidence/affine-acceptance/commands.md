# Reproduction and verification commands

All services were loopback-only. Credential values and disposable cookie values are intentionally omitted.

```sh
node siso/issuer.mjs
corepack yarn workspace @siso/server start   # from apps/siso-knowledge/backend, with sharedEnv() from siso/local.mjs
node siso/package-build.mjs                  # from apps/siso-knowledge
playwright-cli -s=affine-positive-final-20260829 open http://127.0.0.1:4179/w/knowledge-local-workspace/knowledge
playwright-cli -s=affine-negative-20260829 open http://127.0.0.1:4179/w/wrong-workspace/knowledge
npm run typecheck
npm test -- --run
npm run build
git -C apps/siso-knowledge apply --check --directory=frontend clients/actionmodel/blocks/affine-workspace/patches/0001-embed-guards.patch
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4320/api/auth/session
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3012/api/auth/methods
```

The valid-cookie variants of the issuer/backend probes were run with the disposable fixture session in process/browser state; its value is not recorded.
