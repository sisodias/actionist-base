# Actionist Base shell handoff

Status: **PASS**
Lane: `BASE-SHELL-LUNA`
Branch: `feat/base-shell-tokens`
Date: 2026-08-29

## Result

The fixture now has a replaceable, recipe-driven Actionist shell with the
SISOCRM grouped-rail interaction shape: 232px expanded / 52px compact rail,
grouped labels, destination-preserving compact icons, active-route treatment,
sticky top bar, settings entry, workspace/product identity, safe collapse
persistence, keyboard-visible focus and reduced-motion behavior. At 760px and
below the rail becomes an overlay drawer with a backdrop, Escape close, focus
return and inert closed state.

`ProductRecipe.theme` selects dark/light/system-ready presets and typed semantic
overrides. `src/tokens.ts` owns the host map; `src/tokens.css` owns preset
values; blocks mounted beneath `[data-content-mount="host"]` inherit the
variables and do not need donor or component token names.

## Changed files

- `src/shell.tsx` — recipe-driven rail, top bar, settings/workspace dock, active matching, persistence, mobile drawer and search event port.
- `src/style.css` — product-neutral shell/canvas styling, donor-derived material/geometry, responsive and reduced-motion rules.
- `src/tokens.ts` / `src/tokens.css` — typed semantic map and dark/light/system-ready CSS presets.
- `src/host.ts` — recipe theme/settings/workspace types, shell component type, and optional lifecycle activity guard.
- `src/app.tsx` — recipe prop boundary, route-aware shell integration, dynamic settings route, popstate handling and stale lifecycle protection.
- `src/shell.test.tsx`, `src/tokens.test.ts`, `src/host.test.ts` — navigation, recipe swap, replacement, compact/persistence, accessibility/mobile, token output and lifecycle tests. Shell tests install an in-memory `Storage` only when the standard runtime has no usable `window.localStorage`.
- `index.html` — title, viewport, theme color and self-contained favicon to keep browser console clean.
- `docs/SISOCRM-SHELL-EXTRACTION.md` — retain/adapt/reject table, source refs, token ownership and deviations.
- `evidence/base-shell/` — runtime JSON, concise evidence notes and four browser screenshots.

## Verification

- `PATH=/opt/homebrew/bin:$PATH npm run typecheck` — PASS.
- `PATH=/opt/homebrew/bin:$PATH npm test -- --run` — PASS, 5 files / 29 tests. Node may print its expected `localStorage is not available` warning; the test-only in-memory seam handles it without changing production storage guards.
- `PATH=/opt/homebrew/bin:$PATH npm run build` — PASS, Vite production bundle generated.
- `PATH=/opt/homebrew/bin:$PATH git diff --check` — PASS.
- Browser: Playwright CLI on `http://127.0.0.1:4180/w/knowledge-local-workspace/fixture`; zero console errors after favicon fix.
- Desktop: expanded rail measured 232px, workspace offset 264px, compact state measured four destinations, fixture mount preserved, active compact destination exposed as `aria-current="page"`, body/document widths matched 1280px.
- Mobile: 390×844 closed rail was inert; open drawer had backdrop, `transform:none`, focus on `Collapse rail`, mounted content preserved; Escape returned focus to `Open navigation`; Tab skipped the inert rail to `Open global search`; body/document widths matched 390px.

Evidence files: `evidence/base-shell/desktop-expanded.png`,
`desktop-compact.png`, `mobile-closed.png`, `mobile-open.png`, and
`runtime.json`.

## Deliberate non-goals

No auth, AFFiNE adapter, SDK lifecycle, backend proxy, runtime service,
notification backend, settings backend, command palette/search implementation,
visual builder, CRM routes/data/business rules, new dependencies or donor
repository edits were introduced. Search affordances emit
`actionist:open-search` for a future host port only.

## Merge notes

- No commit or push was made. Merge the worktree changes after the AFFiNE lane
  converges; resolve overlap in `src/app.tsx`, `src/host.ts` and imports rather
  than replacing the token/shell files wholesale.
- The lifecycle activity guard is intentionally backward-compatible: callers
  of `runBlockLifecycle` need no change; the App supplies the optional guard so
  stale StrictMode/direct-load runs cannot clear a current block mount.
- The configured port 4179 was occupied by a different sibling worktree. The
  owning process/cwd was checked and browser evidence was captured from this
  worktree on explicit port 4180.
- The donor checkout was already dirty when inspected. This lane issued no
  donor writes and did not clean or reset it; preserve its pre-existing state.
- Serena navigation was attempted first for every named code target, but the
  shared daemon was unavailable (`ECONNREFUSED 127.0.0.1:24225`); the audit
  records this and used narrow direct reads of the named files only.
