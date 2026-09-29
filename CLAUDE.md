# Jot — Project Context - Last Updated September 29th 2026

## Overview
**Jot** is a personal todo app usable from my phone (installed PWA), my laptop browser, a Chrome new-tab page, Siri, and Claude (MCP). Single user (me) for v1, locked with a secret key; real sign-ups come later.

**Jot is the app's name everywhere it names itself** — browser tab, home-screen icon (PWA manifest), OpenAPI/Scalar title, MCP server, Chrome extension, Siri Shortcut, and code (`Jot.Api`, `jot-ui`, the `jot` database). The things in it are still **Todos**.

**This is a learning project.** When recommending an approach, weigh what I'd learn, not just what's simplest — I'll often pick the new thing over the familiar one (e.g. CORS over a Vite proxy, Scalar over Swagger). Where it's reasonable, match what my team at Tenaska uses (React + Vite + TypeScript, controllers + orchestrators, EF Core).

## Current Phase
**Phase 1 — Core todos.** Decisions are in `PHASE-1.md`, broken into GitHub issues #1–#12. Nothing scaffolded yet; next up is #1 (walking skeleton).

## Docs
| File | What's in it | Update when |
|---|---|---|
| `CLAUDE.md` | This file — overview, stack, docs map, dev commands, backlog | The stack, current phase, dev commands, or backlog change |
| `CONVENTIONS.md` | File structure, rules, lessons learned | A folder is added, a pattern is settled, or we learn something the hard way |
| `CONTEXT.md` | Glossary of domain terms — **no implementation details** | A term is added or its meaning changes |
| `V1-PLAN.md` | Main v1 decisions and the 6 phases | A v1-wide decision changes |
| `PHASE-N.md` | Decisions from phase N's grilling session | Something is decided for that phase |
| `FUTURE-WANTS.md` | Features deliberately left out of v1 | Something gets deferred |
| `IDEA.md` | The original idea | Never — kept for history |

## Doc Rules
- Each phase gets a grilling session before any code; its decisions go in `PHASE-N.md`. Once that file is complete, `/to-issues` breaks it into vertical-slice GitHub issues.
- Use the glossary's words everywhere — code, UI text, docs, conversation (**Todo**, not task; **List**, not category).
- If code changes a documented decision, update the doc in the same commit.

## Tech Stack
- **UI** (`ui/`): React 19 + Vite + TypeScript on Node 24 (`.nvmrc`), MUI, TanStack Query, orval (generated API client), `vite-plugin-pwa`
- **API** (`api/`): ASP.NET Core (.NET 10), controllers + orchestrators, EF Core + Npgsql, ProblemDetails errors, Scalar for browsing the OpenAPI doc
- **Database**: PostgreSQL in Docker Compose on host port **5433** (brew Postgres 14 already owns 5432). TablePlus → `localhost:5433`, user / password / database all `jot`.
- **Time zone**: fixed `America/Chicago` for "today" and "overdue".
- **Tests / CI**: xUnit + Testcontainers (API, real Postgres), Vitest (UI), ESLint, `dotnet format --verify-no-changes` — all run by GitHub Actions on every push.
- **Later phases**: MCP server (official C# MCP SDK, phase 2), Oracle Cloud VM (phase 3, Go live), Chrome extension (phase 5), OpenRouter for Siri (phase 6).

## Dev Commands
Run `./dev.sh` and `docker compose` from the repo root, `dotnet` commands from `api/`, and `npm` commands from `ui/`.

| What | Command |
|---|---|
| Run everything (Postgres + API + UI) | `./dev.sh [slot]` — migrates the slot's database first; Ctrl+C stops it. Slots: see Parallel Workflow |
| Start Postgres | `docker compose up -d` |
| First-time API setup | `dotnet tool restore` (installs `dotnet-ef`) |
| Apply migrations | `dotnet ef database update --project Jot.Api` |
| Add a migration | `dotnet ef migrations add <Name> --project Jot.Api --output-dir Data/Migrations` |
| Run the API | `dotnet run --project Jot.Api` → http://localhost:5080, Scalar at http://localhost:5080/scalar |
| API tests | `dotnet test` (needs Docker running — Testcontainers starts its own Postgres) |
| API format check | `dotnet format --verify-no-changes` (drop the flag to fix) |
| First-time UI setup | `nvm use && npm install` |
| Run the UI | `npm run dev` → http://localhost:5173 |
| UI tests | `npm test` (`npm run test:watch` while working) |
| UI lint / build | `npm run lint` / `npm run build` |
| Regenerate the API client | `dotnet build` in `api/`, then `npm run generate` in `ui/` |

## Parallel Workflow
Up to about 3 agents work at once, each on its own issue, and I can run each one's app side by side.

1. **One agent = one worktree = one branch = one issue.** A worktree is an extra working folder that shares this repo's Git history. Start an agent in one with `claude -w <name>`; background sessions create their own. They live in `.claude/worktrees/<name>/`.
2. **The main `todo-list/` folder is mine.** Agents never work in it. I keep it on `main`, or check out an agent's branch there to try it.
3. **Branches follow the Git Workflow below** (`feature/…` / `fix/…` off `main`). If an issue needs an unmerged branch, branch off that one and say so in the PR. New worktrees start from GitHub's `main`, so push `main` before starting agents that need recent commits.
4. **A branch can be checked out in only one folder at a time.** To check an agent's branch out in the main folder, remove its worktree first. To just try it, run it from the worktree with a slot.
5. **Run side by side with slots: `./dev.sh <slot>`.** All slots share one Postgres container (port 5433), but each slot gets its own database, created and migrated on first run.

   | Slot | API | UI | Database |
   |---|---|---|---|
   | 0 — main folder (mine) | 5080 | 5173 | `jot` |
   | N — a worktree (1–9) | 5080 + N | 5173 + N | `jot_N` |

   Give each worktree its own slot. `dev.sh` refuses to start if the slot's ports are taken. In Development, CORS allows any `localhost` port, so every slot's UI can call its own API.
6. **Tests need no slot.** `dotnet test` starts its own throwaway Postgres (Testcontainers), and UI tests fake the API with MSW, so agents can run tests at the same time.
7. **Worktree traps:**
   - Files under `.claude/worktrees/` get the macOS `hidden` flag, so .NET skips `appsettings*.json` there. `dev.sh` passes the connection string as an env var. Running `dotnet run` / `dotnet ef` by hand in a worktree needs `ConnectionStrings__Jot=Host=localhost;Port=5433;Database=jot_N;Username=jot;Password=jot`.
   - The Git stash is shared by every worktree. Set work aside with a WIP commit, not `git stash`.
8. **Clean up after the PR merges:** `git worktree remove .claude/worktrees/<name>`, then `git branch -d <branch>`. `claude -w` offers to remove its worktree when the session ends. If you want the slot's database gone too, drop it with `DROP DATABASE jot_N;` in TablePlus.

## Backlog / Next Steps

> **Rule:** Once an item below is fully done, remove it from this list.

### Setup
- [ ] **Turn on branch protection** — after the CI workflow's first run, add a ruleset on `main`: PRs need CI green, with me on the bypass list.

## Development Flow (enforce these)
1. **Grill → plan → issues.** A phase's grilling session fills `PHASE-N.md`; `/to-issues` breaks it into vertical-slice GitHub issues — each one a thin, working path through database → API → UI → tests.
2. **Labels:** `ready-for-agent` = AFK, can be built and merged without me. `ready-for-human` = HITL, needs me (a review, a decision, or a manual step).
3. **Only pick up an unblocked issue** — check its "Blocked by" section first.
4. **One issue = one branch = one PR.** Never bundle slices together, and never put a whole phase in one PR.
5. **Link the PR to its issue:** `Closes #N` in the PR description (one keyword per issue: `Closes #4, closes #5`). Merging the PR into `main` closes the issue — approving it doesn't.
6. **Trivial commits straight to `main`** can close an issue the same way, with `Closes #N` in the commit message. On a feature branch the keyword does nothing until the commit reaches `main`.
7. **The ruleset requires green CI, not an approval** — GitHub doesn't let you approve your own PR, so requiring one would block every merge.

## Git Workflow (enforce these)
1. **Size decides the flow:**
   - **Trivial / quick changes → commit straight to `main`, no branch, no PR.** Examples: typos, doc tweaks, a one-line fix, a small style nudge, a config or version bump.
   - **Medium or larger changes → branch + PR.** Examples: a new feature or page, logic/behavior changes, anything touching multiple files, anything with new tests.
   - When unsure, treat it as medium and branch.
2. For branch + PR work: create the branch off `main` before the first commit. Naming: `feature/<short-desc>` for new work, `fix/<short-desc>` for bug fixes.
3. `git switch -c <branch>` carries uncommitted changes onto the new branch, so it's fine to branch after editing — just before the first commit.
4. Push with `git push -u origin <branch>`, then open a PR with `gh pr create`. **The PR's title and body follow `.github/pull_request_template.md`**, including a `Closes #N` line for each issue it finishes. **A PR can't merge until CI is green** (branch-protection ruleset on `main`). Do not merge without my go-ahead.
5. I'm on the ruleset's bypass list — that's what lets trivial commits go straight to `main`. Never use the bypass to merge a PR with failing CI.
6. Only commit/push when I ask.
7. **Never credit Claude or AI anywhere** — no `Co-Authored-By` trailer in commits, no "Generated with Claude Code" line in PRs.

## Conventions
@CONVENTIONS.md
