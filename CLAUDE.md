# Todo List — Project Context - Last Updated September 29th 2026

## Overview
A personal todo list usable from my phone (installed PWA), my laptop browser, a Chrome new-tab page, Siri, and Claude (MCP). Single user (me) for v1, locked with a secret key; real sign-ups come later.

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
- **Database**: PostgreSQL in Docker Compose on host port **5433** (brew Postgres 14 already owns 5432). TablePlus → `localhost:5433`.
- **Time zone**: fixed `America/Chicago` for "today" and "overdue".
- **Tests / CI**: xUnit + Testcontainers (API, real Postgres), Vitest (UI), ESLint, `dotnet format --verify-no-changes` — all run by GitHub Actions on every push.
- **Later phases**: MCP server (official C# MCP SDK, phase 2), Oracle Cloud VM (phase 3, Go live), Chrome extension (phase 5), OpenRouter for Siri (phase 6).

## Dev Commands
Added once phase 1 is scaffolded.

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
4. Push with `git push -u origin <branch>`, then open a PR with `gh pr create`, with `Closes #N` in its description. **A PR can't merge until CI is green** (branch-protection ruleset on `main`). Do not merge without my go-ahead.
5. I'm on the ruleset's bypass list — that's what lets trivial commits go straight to `main`. Never use the bypass to merge a PR with failing CI.
6. Only commit/push when I ask.
7. **Never credit Claude or AI anywhere** — no `Co-Authored-By` trailer in commits, no "Generated with Claude Code" line in PRs.

## Conventions
@CONVENTIONS.md
