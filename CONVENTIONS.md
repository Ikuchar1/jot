# Conventions - Last Updated September 30th 2026

How this repo is laid out and how code in it should be written. It grows as we build: when we settle a pattern or learn something the hard way, add it here.

## Repo Structure
```
jot/
├── CLAUDE.md, CONVENTIONS.md, CONTEXT.md, ...  ← docs live at the root
├── ISSUE-TEMPLATE.md    ← the shape of ISSUE.md
├── ISSUE.md             ← a worktree's local copy of its issue; gitignored, never committed
├── docker-compose.yml   ← local Postgres on port 5433
├── dev.sh               ← runs Postgres + API + UI for one slot, so worktrees run side by side
├── .claude/
│   ├── agents/
│   │   └── ui-tester.md ← walks Testing steps in Chrome with playwright-cli and reports pass/fail; never edits
│   └── skills/
│       └── test-ui/     ← /test-ui: briefs ui-tester with a PR's Testing steps, then presents its report
├── .github/
│   ├── dependabot.yml   ← weekly dependency-update PRs (npm, NuGet, Actions) into staging
│   ├── pull_request_template.md  ← how every PR's title and body look
│   └── workflows/
│       ├── ci.yml       ← CI: builds, lints and tests the API and UI on every PR and push to main/staging
│       └── main-from-staging.yml  ← fails any PR into main that isn't from staging
├── api/                 ← ASP.NET Core API (.NET 10); MCP server joins in phase 2
├── ui/                  ← React + Vite + TypeScript PWA
└── extension/           ← Chrome new-tab extension, phase 5                  (planned)
```

```
api/
├── Jot.slnx
├── global.json          ← pins the .NET 10 SDK (CI reads it too); makes `dotnet test` use the Microsoft Testing Platform (xUnit v3 needs it)
├── dotnet-tools.json    ← pins dotnet-ef; `dotnet tool restore` installs it
├── Jot.Api/
│   ├── Controllers/     ← HTTP only
│   ├── Orchestrators/   ← the rules; use JotDbContext directly
│   ├── Dtos/            ← request/response shapes — what the OpenAPI doc describes
│   ├── Data/            ← EF entities, JotDbContext, Migrations/
│   ├── Errors/          ← BrokenRuleException, and the handler that turns it into a 400 ProblemDetails
│   └── Jot.Api.json     ← OpenAPI doc, rewritten on every build; orval reads it
└── Jot.Api.Tests/       ← xUnit v3 + Testcontainers, through HTTP against real Postgres
```

```
ui/
├── .env.development     ← VITE_API_URL: the API's address for `npm run dev`
├── .prettierrc.json     ← Prettier style: no semicolons, single quotes, 120 wide; CI checks it
├── orval.config.ts      ← generates src/api/generated/ from api/Jot.Api/Jot.Api.json
└── src/
    ├── api/
    │   ├── ApiProvider.tsx  ← the QueryClient, and the toast that shows any failed call
    │   ├── fetcher.ts   ← jotFetch: the one place that calls fetch; turns errors into readable messages
    │   └── generated/   ← orval output — committed, never edited by hand
    ├── todos/           ← the Todos page, quick-add, and their tests
    └── test/            ← Vitest setup, MSW server, renderWithProviders
```
Keep these trees current: add a line when a folder or important file is created, and drop "(planned)" once it exists.

## API Rules (enforce these)
1. **Controllers handle HTTP only** — routing, status codes, request/response shapes. No business rules.
2. **Orchestrators hold the rules** and use `DbContext` directly. No repository or service layer.
3. **One home for each rule** — MCP tools (phase 2) and everything else call the orchestrators; never copy logic.
4. **Never return EF entities from controllers** — map to DTOs. The DTOs are the OpenAPI shape orval generates TypeScript from.
5. **Every error is ProblemDetails** — exceptions via the global handler, and errors with no body (a wrong URL's 404) via `UseStatusCodePages()`. No ad-hoc error JSON.
6. **"Today" and "overdue" are worked out in `America/Chicago`** — never the server's local time or UTC.
7. **Schema changes go through EF migrations** — don't change the database by hand or edit generated migration files.
8. **The List entity is `TodoList`, on purpose** — `List` would collide with C#'s `List<T>`. Keep "List" in everything people read (UI, docs, MCP tools); don't rename the class back.
9. **Every action gets a route `Name`** — it becomes the OpenAPI operationId, which orval turns into the hook name (`[HttpPost(Name = "AddTodo")]` → `useAddTodo`).
10. **Commit `Jot.Api.json` with the change that caused it** — the API contract change then shows up in the PR diff.
11. **A request that breaks a rule throws `BrokenRuleException` from the orchestrator** — it becomes a 400 ProblemDetails whose `detail` the UI shows as-is, so write the message for the user. Not DataAnnotations: those only run over HTTP, so MCP tools would skip them.

## UI Rules (enforce these)
1. **Don't hand-write or hand-edit API types or hooks** — orval generates them from the OpenAPI doc. Change the API, then regenerate.
2. **Components never call `fetch` directly** — one TanStack Query hook per action (e.g. `useCompleteTodo()`).
3. **The UI doesn't group or sort by date** — it renders the groups the API returns.
4. **Reach for an MUI component before building a custom one.**
5. **The API's address comes from a Vite env var** — never hardcode it.
6. **New IDs use `v7()` from the `uuid` package** — not `crypto.randomUUID()`, which makes random v4 IDs.
7. **UI tests fake the API with MSW, not by mocking hooks or `fetch`** — so the real generated hooks and `jotFetch` run. A request with no handler fails the test.
8. **Failed API calls show in the toast on their own** — `ApiProvider` catches every query and mutation error. Components don't show their own error messages; a hook's `onError` is only for undoing its own work (like taking an optimistic todo back out). A failed save's toast closes after 6 seconds; a failed load's stays until that load runs again or it's closed with its ×, since nothing else on the page says why the data is missing.

## Lessons Learned
Carried over from other projects, and added to as we go.
- **Test against real Postgres, not SQLite.** In IronDiary, in-memory SQLite tests passed while real Postgres failed on a `DateTime.Kind` write error. That's why this repo uses Testcontainers.
- **Npgsql only writes a `DateTime` to a `timestamptz` column when `Kind == Utc`** — `Unspecified` throws. (IronDiary)
- **Never build a date-only string with `toISOString()`** — it converts to UTC first, which can move the date by a day. Build `YYYY-MM-DD` from local date parts. (IronDiary ADR-0003)
- **EF treats `Guid.Empty` as "no key yet" and silently generates one.** A plain `Guid Id` in a request defaults to `Guid.Empty` when omitted, so an optional ID is `Guid?` and the orchestrator calls `Guid.CreateVersion7()` itself.
- **In Development, an unhandled exception gets the developer exception page unless `app.UseExceptionHandler()` comes first in the pipeline.** With `AddProblemDetails()` registered, that page answers with ProblemDetails too, but it includes the exception's message and stack trace: the status and content type look right while it leaks internals. Tests run in Development, so the 500 test checks the body for the exception's message.
- **Routing's 404 (wrong URL) and 405 (wrong method) have no body**, even with `AddProblemDetails()` registered. `app.UseStatusCodePages()` gives any error response without a body a ProblemDetails.
- **`fetch` doesn't reject on 4xx/5xx.** `jotFetch` throws instead — otherwise TanStack Query treats an error response as success.
- **.NET skips config files with the macOS `hidden` flag.** Claude Code worktrees under `.claude/worktrees/` had it on every file, so `appsettings*.json` silently didn't load (no connection string). Check with `ls -lO`; work around it by passing config as env vars, e.g. `ConnectionStrings__Jot=...` — which is what `dev.sh` does. Anything a worktree needs at dev time must work without appsettings.
