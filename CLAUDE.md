# Todo List — Project Context - Last Updated September 29th 2026

## Overview
A personal todo list usable from my phone (installed PWA), my laptop browser, a Chrome new-tab page, Siri, and Claude (MCP). Single user (me) for v1, locked with a secret key; real sign-ups come later.

**This is a learning project.** When recommending an approach, weigh what I'd learn, not just what's simplest — I'll often pick the new thing over the familiar one (e.g. CORS over a Vite proxy, Scalar over Swagger). Where it's reasonable, match what my team at Tenaska uses (React + Vite + TypeScript, controllers + orchestrators, EF Core).

## Current Phase
**Phase 1 — Core todos.** Grilling session in progress; nothing scaffolded yet. See `PHASE-1.md`.

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
- **Database**: PostgreSQL in Docker Compose on host port **5433** (brew Postgres 14 already owns 5432). TablePlus → `localhost:5433`.
- **Time zone**: fixed `America/Chicago` for "today" and "overdue".
- **Tests / CI**: xUnit + Testcontainers (API, real Postgres), Vitest (UI), ESLint, `dotnet format --verify-no-changes` — all run by GitHub Actions on every push.
- **Later phases**: MCP server (official C# MCP SDK, phase 2), Oracle Cloud VM (phase 3, Go live), Chrome extension (phase 5), OpenRouter for Siri (phase 6).

## Dev Commands
Added once phase 1 is scaffolded.

## Backlog / Next Steps

> **Rule:** Once an item below is fully done, remove it from this list.

### Setup
- [ ] **Run `/to-issues` on `PHASE-1.md`** — once the phase 1 grilling is finished. I run it myself.
- [ ] **Install Node 24** — `nvm install 24` (Mac is on 22.14 via nvm). Once `.nvmrc` exists, `nvm use` in the repo switches to it.
- [ ] **Turn on branch protection** — after the CI workflow's first run, add a ruleset on `main`: PRs need CI green, with me on the bypass list.

## Git Workflow (enforce these)
1. **Size decides the flow:**
   - **Trivial / quick changes → commit straight to `main`, no branch, no PR.** Examples: typos, doc tweaks, a one-line fix, a small style nudge, a config or version bump.
   - **Medium or larger changes → branch + PR.** Examples: a new feature or page, logic/behavior changes, anything touching multiple files, anything with new tests.
   - When unsure, treat it as medium and branch.
2. For branch + PR work: create the branch off `main` before the first commit. Naming: `feature/<short-desc>` for new work, `fix/<short-desc>` for bug fixes.
3. `git switch -c <branch>` carries uncommitted changes onto the new branch, so it's fine to branch after editing — just before the first commit.
4. Push with `git push -u origin <branch>`, then open a PR with `gh pr create`. **A PR can't merge until CI is green** (branch-protection ruleset on `main`). Do not merge without my go-ahead.
5. I'm on the ruleset's bypass list — that's what lets trivial commits go straight to `main`. Never use the bypass to merge a PR with failing CI.
6. Only commit/push when I ask.
7. **Never credit Claude or AI anywhere** — no `Co-Authored-By` trailer in commits, no "Generated with Claude Code" line in PRs.

## Conventions
@CONVENTIONS.md
