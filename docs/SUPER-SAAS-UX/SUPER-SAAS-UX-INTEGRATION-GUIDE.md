# Super SaaS UX integration guide

This source checkpoint provides routeable presentation surfaces around the
exact checked-in Base shell. It does not add auth, session, tenancy, billing,
provider, install or persistence authority.

## Entry points

- `App` in `src/app.tsx` accepts an optional shell, recipe, `ProductUiReadModel`
  and `ProductUiActions`.
- `DefaultShell` remains the standard SISOCRM-derived chrome.
- `ProductUiReadModel` and `ProductUiActions` live in
  `src/ui/product-types.ts` and are the presentation boundary.
- `LoginSurface` accepts one `LoginSurfaceProps` contract across focused,
  split and compact variants.
- `ProductSurface` resolves the non-block product routes without adding a
  router dependency.

The checked-in fixture model is deliberately untrusted. It labels the account,
workspace, session and block registrations as fixture data; billing is runtime
unavailable; every command is absent.

## Route inventory

| Path | Composition | Default truth |
| --- | --- | --- |
| `/login`, `/login/focused` | Focused login presentation | auth adapter not connected |
| `/login/split` | Editorial split login presentation | auth adapter not connected |
| `/login/compact` | Compact login presentation | auth adapter not connected |
| `/w/:workspaceId` and `/w/:workspaceId/dashboard` | Dashboard readback | fixture and unavailable labels |
| `/w/:workspaceId/workspaces` | Workspace switcher | one fixture readback; selection disabled |
| `/w/:workspaceId/blocks` | Registry and install intent | source registered; install disabled |
| `/w/:workspaceId/settings` | Settings overview | read-only |
| `/w/:workspaceId/settings/account` | Account readback | fixture account; no save action |
| `/w/:workspaceId/settings/billing` | Billing readback | provider unavailable; no mutation action |
| `/w/:workspaceId/knowledge` | Existing AFFiNE block lifecycle | existing host fixture rules |
| `/w/:workspaceId/fixture` | Existing fixture block lifecycle | existing host fixture rules |
| `/w/:workspaceId/shell` | Shell replacement contract | source fixture |

Login routes render outside the product shell. Navigating to the dashboard
from a login presentation is explicitly labelled as opening the source
fixture; it is not an authentication transition.

## Base SaaS adapter map

Base SaaS checkpoint `d79e0b57c389e6b902a87a28bb0a0c693e0b14be`
exposes the authoritative non-UI seams. Adapt them as follows after the Base
candidate is integrated:

### Session readback

Map redacted `HostSessionReadback` into `ProductUiReadModel.session`:

- retain `status`, `authenticated`, `tenantId`, `workspaceId` and expiry;
- project capabilities to `capabilityCount` for the current summary;
- use a redacted display label from `AuthenticatedHostPrincipal` if wanted;
- set evidence to `fixture` for the credentialless fixture flow and `observed`
  only for a current provider-backed runtime observation;
- never place `HostAccessGrant.assertion`, a token, cookie, credential or
  authorization header in the UI model.

### Login

`ProductUiActions.login` is a presentation intent, not a direct alias of
`FixtureHostAuthenticator.login`. The current email/password form remains
disconnected by default. A Base-owned adapter may:

1. use a future production authenticator that is allowed to consume that
   credential intent;
2. authenticate and enumerate tenancy memberships;
3. select only a membership returned by `HostTenancyDirectory.list`;
4. call `BaseSessionAuthority.login`;
5. refresh `ProductUiReadModel` from the redacted session readback.

Do not pass form passwords to the checked-in credentialless
`FixtureHostAuthenticator`, whose exact request is `{ principalId }`. If a
fixture login is later exposed, give it separately labelled principal choices
rather than disguising it as email/password auth.

A generic `UiActionResult.ok` never proves authentication. The parent must
refresh the read model from Base before rendering authenticated truth.

### Workspace selection

Map every `TenantWorkspaceSelection` from
`HostTenancyDirectory.list(principalId)` into a `WorkspaceReadback`, retaining
both `tenantId` and `workspaceId`. `ProductUiActions.selectWorkspace` receives
those two opaque identifiers. The Base adapter closes over the current
principal and calls `select(principalId, tenantId, workspaceId)`.

Never accept a workspace that is absent from the current directory list. Route
construction stays `/w/:workspaceId`, and a path/readback mismatch must be
denied before block lifecycle work.

### Registry and navigation

Project `HostBlockRegistry.list()` into block readbacks and use
`navigationGroups(grantedCapabilities)` for visible navigation. Preserve the
full `requiredCapabilities` set in the adapter. The UI's install callback emits
only `{ blockId }`; Base must resolve that id to a complete
`HostBlockInstallation`, reject id/route conflicts and refresh both registry
and navigation readbacks after the command.

`source-registered` means the item exists in this fixture source.
`host-registry-entry` means Base returned a registry record. Neither phrase
proves database durability. Use `installed` only when the product contract
defines and observes that state.

### Account and billing

These are Base Platform read models, not Base SaaS session fields. Adapt
`PlatformAccountReadModel` and `PlatformBillingReadModel` through the separately
coordinated read-only platform port. Never infer plan, subscription, payment or
provider state from a host session.

## Evidence mapping

The four UI evidence states are fixed:

- `fixture`: checked-in synthetic data or a credentialless fixture operation;
- `configured-unverified`: configuration exists but runtime was not observed;
- `observed`: the owning adapter returned a current runtime readback;
- `unavailable`: no owning adapter/result exists or runtime is unavailable.

Do not render Active, Paid, Installed, Saved, Connected or Ready from
configuration presence or a generic successful callback alone.

## Replaceability

To replace the visual shell, pass `App({ Shell })`; block mount contracts do
not change. To replace a login presentation, select another `LoginVariant` or
provide a component that consumes the same `LoginSurfaceProps`. To integrate
provider state, inject read models and actions; components do not import
provider implementations.

## Verification gate

Source review may check imports, paths and truth copy now. Do not claim test,
typecheck, build or browser success from this checkpoint. A separate PM compute
receipt must admit dependency installation, one loopback listener on the
requested port, desktop/mobile browser inspection and screenshots.
