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
- **Stack** — Angular (PWA) frontend, ASP.NET Core API + MCP server (official C# MCP SDK), PostgreSQL.
- **Hosting ($0)** — everything (frontend, API + MCP server + reminder scheduler, PostgreSQL) on an Oracle Cloud Always Free VM. The VM is its own side project, shared with other things I host. Until it's ready, assume it exists and build locally; migrate over once it's up.
  - Needs an always-on process — free tiers that sleep (Render, etc.) would miss reminders.
  - Watch Oracle's idle-VM reclamation.
