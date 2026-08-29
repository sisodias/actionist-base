# Base shell browser evidence

Captured 2026-08-29 from the running worktree app on the Vite override port
4180. The configured 4179 port was occupied by a different sibling worktree,
so the server was started explicitly on 4180; the owning process was checked
before choosing the alternate port.

`runtime.json` records the concise DOM and interaction probes. The four PNGs
are Playwright CLI screenshots from the same page:

- `desktop-expanded.png`: 1,280px desktop fixture route with the 232px grouped rail.
- `desktop-compact.png`: the same route after the collapse control; four compact destinations and the mounted fixture remain.
- `mobile-closed.png`: 390px drawer closed; the rail is inert and the body has no horizontal overflow.
- `mobile-open.png`: 390px drawer open; backdrop, labels, focus target and mounted content remain visible.

Browser checks returned zero console errors after adding the self-contained
favicon in `index.html`. The mobile Escape probe returned focus to `Open
navigation`; desktop and mobile scroll widths matched the viewport in every
recorded state.
