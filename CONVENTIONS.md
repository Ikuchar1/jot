# Conventions - Last Updated September 29th 2026

How this repo is laid out and how code in it should be written. It grows as we build: when we settle a pattern or learn something the hard way, add it here.

## Repo Structure
```
todo-list/
├── CLAUDE.md, CONVENTIONS.md, CONTEXT.md, ...  ← docs live at the root
├── docker-compose.yml   ← local Postgres on port 5433                        (planned)
├── .github/workflows/   ← CI: build, test, lint                              (planned)
├── api/                 ← ASP.NET Core API (.NET 10); MCP server joins in phase 2  (planned)
├── ui/                  ← React + Vite + TypeScript PWA                      (planned)
└── extension/           ← Chrome new-tab extension, phase 5                  (planned)
```
Keep this tree current: add a line when a folder or important file is created, and drop "(planned)" once it exists. `api/` and `ui/` get their own trees when they're scaffolded.

## API Rules (enforce these)
1. **Controllers handle HTTP only** — routing, status codes, request/response shapes. No business rules.
2. **Orchestrators hold the rules** and use `DbContext` directly. No repository or service layer.
3. **One home for each rule** — MCP tools (phase 2) and everything else call the orchestrators; never copy logic.
4. **Never return EF entities from controllers** — map to DTOs. The DTOs are the OpenAPI shape orval generates TypeScript from.
5. **Every error is ProblemDetails** via the global handler — no ad-hoc error JSON.
6. **"Today" and "overdue" are worked out in `America/Chicago`** — never the server's local time or UTC.
7. **Schema changes go through EF migrations** — don't change the database by hand or edit generated migration files.
8. **The List entity is `TodoList`, on purpose** — `List` would collide with C#'s `List<T>`. Keep "List" in everything people read (UI, docs, MCP tools); don't rename the class back.

## UI Rules (enforce these)
1. **Don't hand-write or hand-edit API types or hooks** — orval generates them from the OpenAPI doc. Change the API, then regenerate.
2. **Components never call `fetch` directly** — one TanStack Query hook per action (e.g. `useCompleteTodo()`).
3. **The UI doesn't group or sort by date** — it renders the groups the API returns.
4. **Reach for an MUI component before building a custom one.**
5. **The API's address comes from a Vite env var** — never hardcode it.
6. **New IDs use `v7()` from the `uuid` package** — not `crypto.randomUUID()`, which makes random v4 IDs.

## Lessons Learned
Carried over from other projects, and added to as we go.
- **Test against real Postgres, not SQLite.** In IronDiary, in-memory SQLite tests passed while real Postgres failed on a `DateTime.Kind` write error. That's why this repo uses Testcontainers.
- **Npgsql only writes a `DateTime` to a `timestamptz` column when `Kind == Utc`** — `Unspecified` throws. (IronDiary)
- **Never build a date-only string with `toISOString()`** — it converts to UTC first, which can move the date by a day. Build `YYYY-MM-DD` from local date parts. (IronDiary ADR-0003)
