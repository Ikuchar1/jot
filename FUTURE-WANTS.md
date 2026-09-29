# Future Wants

Features deliberately left out of v1, to revisit in a later phase.

- **Auth / multiple users** — real sign-ups so other people can use it, not just me. Every entry point (web, Siri, MCP) will need per-user auth. Replaces the v1 single secret key.
- **Time zone follows me** — v1 uses a fixed home time zone (Central). Later: use the device's time zone when traveling, and a per-user time zone once there are multiple users.
- **Full offline mode** — add and complete todos offline, sync when back online. v1 is read-only offline.
- **Playwright end-to-end tests** — a script drives a real browser to click through the app. For local development, not the CI pipeline.
- **Drag-to-reorder todos** — manual ordering within a list. v1 sorts automatically by due date.
- **Google Calendar integration** — e.g. weekly reminders showing up on my calendar. Direction (todos → calendar, calendar → todos, or two-way) still undecided. Until then, Claude can bridge the todo MCP and Google Calendar connector.
