# SISOCRM shell extraction record

Audit date: 2026-08-29  
Target: `actionist-base-shell-worktree` (`feat/base-shell-tokens`)  
Donor: `/Users/shaansisodia/SISO_Workspace/SISO_Agency/apps/SISOCRM/product-app`

This is a shell-only extraction. SISOCRM remains the donor application and is
not edited by this worktree. The donor source was read directly after the
shared Serena daemon returned `ECONNREFUSED`; no donor code was copied into the
worktree without adapting its product and router boundaries.

The donor decision is consistent with `SISOCRM/docs/REUSE_PLAN.md`: keep the
grouped rail, top-bar geometry, compact/expanded behavior, focus treatment and
semantic token idea; remove CRM routes, data, integrations and identity.

## Retain / adapt / reject

| Surface | Source evidence | Retain | Adapt in Actionist Base | Reject |
| --- | --- | --- | --- | --- |
| Grouped navigation | Donor `src/components/GroupedRail.tsx:1-6,106-159,258-304` | Expanded mode shows labeled groups; compact mode preserves every destination as an icon; rail has an observable state contract. | `ProductRecipe.navigation` supplies groups, ordering, labels, routes and icon keys. Base uses `onNavigate` through `ShellProps` instead of a router-specific link component. | `RAIL_GROUPS`, brokerage/company vocabulary and every hardcoded donor route. |
| Rail geometry | Donor `src/components/GroupedRail.tsx:266-269`; `src/styles/GroupedRail.css:13-34,602-664`; donor token sizing `src/styles/tokens.css:220-238` | 232px expanded rail, 52px compact rail, 16px desktop inset, 44px touch controls, fixed rail and workspace reflow. | Values are owned by the typed Actionist host map and `tokens.css`; selectors are `shell-*` and the rail can become a mobile drawer. | `--crm-*`, `--siso-*`, CRM class names and a dependency on donor theme files. |
| Rail material | Donor `src/styles/GroupedRail.css:36-104,116-135,165-219,427-432,500-550` | Glass/champagne edge, bloom, noise layer, active destination surface, compact icon surface and restrained shadows. | The visual recipes are renamed to product-neutral `--actionist-*` semantic variables. A text monogram replaces the donor image asset so the base has no asset/auth dependency. | Donor asset paths, SISO branding, unbounded visual effects and a copied donor stylesheet. |
| Focus and motion | Donor `src/styles/GroupedRail.css:137-146,666-677` | Visible focus ring and reduced-motion fallback. | Focus applies to brand, collapse, search, group, settings, compact, top-bar and mobile controls; reduced motion is a host-wide media contract. | Donor-specific color variables and assuming CSS inspection is enough; browser evidence is required. |
| Search entry | Donor `src/components/GroupedRail.tsx:80-104`; donor top-bar action in `src/App.tsx:338-366` | Rail and top-bar search affordances with `⌘K` labeling. | Both emit `actionist:open-search`, a host port for a future command/search implementation. The base does not implement search. | Donor command palette, page index, module postMessage events and CRM page names. |
| Settings entry | Donor `src/components/GroupedRail.tsx:60-64,221-227` | A stable settings destination belongs in the shell chrome. | `ProductRecipe.settings` controls its label, route and icon; the fixture renders an unavailable state because no settings backend is in scope. | Admin/profile routes, user-role branching and donor settings integrations. |
| Identity/workspace dock | Donor `src/components/GroupedRail.tsx:196-256,276-294` | Product identity sits in the rail; the lower dock communicates an active context. | Recipe supplies product name/subtitle; the kernel supplies workspace name/id/detail through optional `ShellProps.workspace`. The dock is non-authenticated and uses a generated initial. | `HostUser`, admin status, donor profile menu, account image and SISO CRM identity copy. |
| Top bar and canvas | Donor `src/styles/app.css:16-47,100-107`; donor top-bar markup `src/App.tsx:338-366` | Sticky top bar, breadcrumb/current destination, workspace reflow and a roomy canvas. | Current route label is resolved from the recipe; canvas is a host content mount and remains usable at mobile widths. | CRM page-name map, module iframe canvas, Teable/Postiz/OpenWork/docs integrations and donor body overflow policy. |
| Routing seam | Donor `src/components/GroupedRail.tsx:8-9,121-155`; current fixture `src/host.ts:40` | Route-aware active treatment and one destination map in both rail modes. | Buttons call `ShellProps.onNavigate`; `isRouteActive` handles nested paths and avoids root-prefix false positives. | `react-router-dom`, `NavLink`, donor navigation state, auth redirects and business route ownership. |
| Token layer | Donor `src/styles/tokens.css:126-238,240-339` | Centralized semantic surface/text/border/action/status/type/space/radius/effect values. | `src/tokens.ts` is the typed host map; `src/tokens.css` provides dark, light and system-ready presets. Recipes may supply typed semantic overrides only. | `--crm-*` compatibility aliases, `--siso-*` lineage, donor-specific accent names and raw `accent/canvas` recipe fields. |
| Mobile behavior | `SISOCRM/docs/REUSE_PLAN.md` shell contracts and extraction criteria; current donor `GroupedRail.css` ends at `:604-677` with no drawer media rule. | The documented requirement that mobile expansion overlays rather than crushes the work area. | Base adds a 760px overlay/drawer, backdrop, Escape close, focus return and `inert` on a closed mobile rail. This is an explicit adaptation, not claimed donor behavior. | Treating the donor’s desktop CSS as mobile proof. |
| Host/block boundary | Current fixture `src/host.ts:40`; current mount flow `src/app.tsx` | Children remain mounted through the shell; loading, denied, unavailable and error surfaces remain host-owned. | The root advertises `data-token-contract="actionist-host-v1"`; mounted block descendants inherit host variables without importing shell CSS. | Block-specific token roots, donor business rules, auth/service lifecycle changes and backend work. |

## Token ownership and block consumption contract

`src/tokens.ts` owns the stable semantic names and the `HOST_TOKEN_MAP` from
typed names to CSS custom properties. `src/tokens.css` owns preset values and
the `light`/`dark`/`system` mode selectors. `ProductRecipe.theme` owns only the
selected mode and optional typed semantic overrides. `src/style.css` consumes
the variables for shell and fixture surfaces.

The host root emits `data-token-contract="actionist-host-v1"` and applies the
resolved override map. Every block mounted below
`[data-content-mount="host"]` receives the variables through normal CSS
inheritance. A block may consume `var(--actionist-...)` in its own stylesheet
or use `hostToken(name)` for an inline style/adapter. A block must not redefine
host variables, inspect donor variables, or depend on a specific preset. Token
values are not a replacement for capability checks or runtime bindings.

## Boundary preserved

`ShellProps` remains the replacement seam: `recipe`, `active`, `children` and
`onNavigate` are required; workspace context is optional. `SwappableShell` and
`App({ Shell })` accept an alternate shell without changing block registry,
lifecycle, AFFiNE adapter or runtime service code.

## Deliberate deviations

1. The current donor uses `NavLink` and React Router; the fixture intentionally
   uses host callback buttons so the base does not acquire donor routing.
2. The donor has notification/new-deal/profile integrations; the base retains
   the visual search/settings affordances but leaves search as an event port and
   does not invent notification or settings backends.
3. The donor’s current rail source has no mobile drawer implementation. The
   required mobile overlay, focus return and inert behavior are implemented as
   a small host adaptation and verified in the browser.
