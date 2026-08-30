# Base UX research and provenance

Recorded: 2026-08-30
Owner: BASE-UX-SHELL-SOL / AM-032

## Decision

The checked-in SISOCRM extraction is the only product-shell lineage used by
this checkpoint. New dashboard, login, workspace, registry, account and
billing surfaces are first-party Actionist source composed on its existing
token contract. No marketplace component code, asset, screenshot or metadata
was copied.

The detailed machine-readable record is `COMPONENT-PROVENANCE.json` in the
durable AM-032 run.

## 21st.dev

[21st.dev](https://21st.dev/) was reviewed as a multi-author component
marketplace. Its [terms](https://21st.dev/terms) say authors retain ownership of
their submitted component code, so the marketplace does not provide one
blanket component licence. This checkpoint therefore uses 21st.dev only for
market awareness. No component was selected or copied.

Origin UI's public layout experiments were also inspected because they appear
in the same current component ecosystem. The repository had no `LICENSE` file
at observed commit `aea7f714c94dccb3a62a3e932b1debe9cffbd5df`; its README permitted
project use but prohibited redistribution or resale, including partial
redistribution. Reuse was rejected because Base is itself reusable source.

## Maintained open-source references

| Project | Observed commit | Activity observation | Licence | Decision |
| --- | --- | --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | `f9ea1e600ea5dd7b1b79769b7b25cafa400cee6f` | pushed 2026-08-30 | MIT | Reference only. Its copy-owned composition pattern was useful, but Tailwind and Radix package work is held. |
| [Magic UI](https://github.com/magicuidesign/magicui) | `2d671cc6c0e0f40e28682c9cbddd16694dcfe627` | pushed 2026-08-11 | MIT | Reference only. Decorative marketing motion was rejected for this restrained product shell. |
| [Mantine](https://github.com/mantinedev/mantine) | `8a284e2c2c53a9cb6f39f5dc389bf41b7a2073f8` | pushed 2026-08-22 | MIT | Reference only. Introducing its runtime packages is outside scope. |
| [Tremor](https://github.com/tremorlabs/tremor) | `ca4d588f47820ff3d514d37fa4ee08a4222dec11` | pushed 2025-10-10 | Apache-2.0 | Reference only. No chart or synthetic SaaS metric was justified. |
| [Lucide](https://github.com/lucide-icons/lucide) | `796dad298f8d78c5da204c3e62a5ed93c2bfcd1e` | pushed 2026-08-29 | ISC, with MIT terms for listed Feather-derived icons | Existing `lucide-react@1.37.0` dependency only. No package change. |

Activity dates are observations, not maintenance guarantees. Repository head,
licence and source status were captured before product-source implementation.

## Retain, adapt, reject

Retained from the exact checked-in shell:

- 232px expanded rail, 52px compact rail and 16px desktop inset;
- grouped navigation with destination parity in compact mode;
- glass and champagne material, bloom, noise and restrained active treatment;
- search, settings, workspace dock, sticky top bar and host canvas;
- token inheritance, focus visibility, reduced motion and mobile drawer;
- `ShellProps`, `DefaultShell` and `SwappableShell` replacement seams.

Adapted as first-party product source:

- recipe groups now expose dashboard, workspaces, block registry, knowledge,
  fixture block and shell contract;
- three login presentations share one optional login action;
- dashboard metrics are replaced with labelled readbacks;
- workspace, registry, account and billing controls render their authority
  boundary beside the surface;
- responsive product grids sit inside the unchanged shell geometry.

Rejected:

- donor CRM routes, data, integrations, identity and profile behavior;
- marketplace component source or preview assets;
- synthetic revenue, subscription, member, usage or activity numbers;
- UI-owned authentication, grants, workspace membership, install persistence,
  billing mutation or provider readiness;
- new UI framework, router, animation, form or package dependencies.

## Runtime status

Licence and source provenance are statically evidenced. Tests, typecheck,
build, listener, browser inspection and screenshots were not run because the
controlling PM compute hold remains active. Nothing in this document upgrades
source completeness into runtime proof.
