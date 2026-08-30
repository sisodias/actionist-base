# Base UX shell handoff

Owner: BASE-UX-SHELL-SOL / AM-032
State: source checkpoint prepared; runtime proof held

## Delivered in source

- the exact checked-in SISOCRM-derived grouped rail remains the shell;
- dashboard with evidence-based readbacks and no synthetic SaaS metrics;
- focused, split and compact login presentations sharing one auth action seam;
- workspace switcher using tenant plus workspace identity;
- block registry that separates source registration from installation;
- settings overview, account readback and billing readback;
- public and workspace-scoped route composition without a router package;
- responsive desktop/mobile source styles;
- static source tests for login truth labels, dashboard defaults and billing
  non-claims;
- research, licence, provenance and Base SaaS integration documentation.

## Deliberate non-claims

The fixture does not authenticate a user, create a session, enumerate real
memberships, switch a real workspace, install or persist a block, read a
billing provider, save account data or prove runtime readiness. Controls that
need those authorities are disabled when their action callback is absent.

## Consumer contract

Inject `ProductUiReadModel` and `ProductUiActions` into `App`. Refresh the read
model from the owning Base SaaS or Base Platform source after every command.
Do not convert a callback's `ok` flag into product truth. The exact field and
authority mapping is in `SUPER-SAAS-UX-INTEGRATION-GUIDE.md`.

## Verification state

The package-manager, dependency-install, test, typecheck, build, listener,
browser and screenshot gate remains closed. The source checkpoint therefore
records those checks as not run, not passed. The requested future preview is a
single strict loopback listener on port 4187, but its command must remain
unexecuted until a separate PM compute receipt.

## Durability

This lane creates one bounded local source commit after exact path, diff,
privacy and secret review. It stops before push. Remote publication, runtime
proof and screenshots require later PM decisions.
