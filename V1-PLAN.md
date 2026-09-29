# V1 Plan — Main Ideas

High-level decisions from the first grilling session. Each area gets its own in-depth refinement session when we reach that phase.

## Decided

- **Build my own** — own API, database, and web app. Not a wrapper around Apple Reminders.
- **Single user (just me)** — sign-ups/multi-user are in `FUTURE-WANTS.md`.
- **Locked with a single secret key** — Siri, the Chrome extension, and Claude Code send it with requests; for claude.ai / the Claude app connector it lives in the connector URL. Stopgap until real auth.
- **Phone + laptop = one PWA** — no native iOS app. Installed to the iPhone home screen; same web app on the laptop.
- **Todos** — title, done / not done, optional due date and time.
- **Reminders** — fire once, or repeat on an interval from a start time (e.g. every 4 hours from 8am tomorrow).
- **Repeating todos** — todos that come back on a schedule (e.g. every Tuesday).
- **New tab (Chrome)** — a small Chrome extension replaces the new-tab page with the web app.
- **AI access anywhere** — a remote (hosted) MCP server, usable from the Claude app on iPhone, claude.ai, and Claude Code.
- **Smart Siri** — an Apple Shortcut sends the spoken sentence to my API, which uses an LLM through a gateway like OpenRouter (free model) to turn it into a todo + reminders. Partly a learning goal.
  - **Backup:** the Claude iOS app's built-in "Ask Claude" Siri intent, which runs on my Claude subscription and could use the todo MCP server directly (unconfirmed whether the intent can call connectors).
- **Stack** — React (PWA) frontend (switched from Angular to match what my team at Tenaska uses), ASP.NET Core API + MCP server (official C# MCP SDK), PostgreSQL.
- **Hosting ($0)** — everything (frontend, API + MCP server + reminder scheduler, PostgreSQL) on an Oracle Cloud Always Free VM. The VM is its own side project, shared with other things I host. Until it's ready, assume it exists and build locally; migrate over once it's up.
  - Needs an always-on process — free tiers that sleep (Render, etc.) would miss reminders.
  - Watch Oracle's idle-VM reclamation.

## Phases

Each phase gets its own in-depth grilling session before building.

1. **Core todos** — API, PostgreSQL, and React PWA; add, edit, complete, and delete todos. Runs locally.
2. **MCP server** — Claude Code can manage todos. Runs locally.
3. **Go live** — secret key, containerize the API and UI, deploy to the Oracle VM with HTTPS, then connect claude.ai and the Claude iPhone app. Needs the Oracle VM ready by then.
   - Comes before Scheduling (moved up from last): iPhone push only works for a PWA installed from an HTTPS site, reminders need an always-on server (not a laptop), and the Siri Shortcut needs a public API. Bonus: real phone use after 3 phases instead of 6.
4. **Scheduling** — reminders, repeating todos, and push notifications.
   - Must-have: setting up "every day at a set time" has to be quick and obvious — the thing Apple Reminders makes painful.
   - Must-have: "8am" stays 8am Central across daylight saving. Store the schedule as Central wall-clock time and work out each next firing from it — never "last firing + 24 hours" in UTC, which drifts to 7am when daylight saving ends.
5. **Chrome new tab** — the extension that shows the list on every new tab.
6. **Smart Siri** — an Apple Shortcut sends the spoken sentence to the API, which uses OpenRouter to turn it into todos + reminders.
