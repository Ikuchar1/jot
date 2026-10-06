# Jot — Project Context - Last Updated October 6th 2026

## Overview
**Jot** is a personal todo app usable from my phone (installed PWA), my laptop browser, a Chrome new-tab page, Siri, and Claude (MCP). Single user (me) for v1, locked with a secret key; real sign-ups come later.

**Jot is the app's name everywhere it names itself** — browser tab, home-screen icon (PWA manifest), OpenAPI/Scalar title, MCP server, Chrome extension, Siri Shortcut, and code (`Jot.Api`, `jot-ui`, the `jot` database). The things in it are still **Todos**.

**This is a learning project.** When recommending an approach, weigh what I'd learn, not just what's simplest — I'll often pick the new thing over the familiar one (e.g. CORS over a Vite proxy, Scalar over Swagger). Where it's reasonable, match what my team at Tenaska uses (React + Vite + TypeScript, controllers + orchestrators, EF Core).

## Current Phase
**Phase 1 — Core todos.** Decisions are in `PHASE-1.md`, broken into GitHub issues #1–#12. #1 (walking skeleton), #2 (CI pipeline + branch protection), #3 (API errors show as a toast) and #4 (complete a todo) are built; next up is #5 (delete a todo with undo toast).

## Docs
| File | What's in it | Update when |
|---|---|---|
| `CLAUDE.md` | This file — overview, stack, docs map, dev commands, backlog, the agent `## Workflow` contract | The stack, current phase, dev commands, or backlog change; **CI changes** (keep Workflow's Checks in step with `ci.yml`, same commit) |
| `CONVENTIONS.md` | File structure, rules, lessons learned | A folder is added, a pattern is settled, or we learn something the hard way |
| `CONTEXT.md` | Glossary of domain terms — **no implementation details** | A term is added or its meaning changes |
| `V1-PLAN.md` | Main v1 decisions and the 6 phases | A v1-wide decision changes |
| `PHASE-N.md` | Decisions from phase N's grilling session | Something is decided for that phase |
| `FUTURE-WANTS.md` | Features deliberately left out of v1 | Something gets deferred |
| `ISSUE-TEMPLATE.md` | The shape of a worktree's local, gitignored `ISSUE.md` | What an agent copies from an issue changes |
| `IDEA.md` | The original idea | Never — kept for history |

## Doc Rules
- Each phase gets a grilling session before any code; its decisions go in `PHASE-N.md`. Once that file is complete, `/to-issues` breaks it into vertical-slice GitHub issues.
- Use the glossary's words everywhere — code, UI text, docs, conversation (**Todo**, not task; **List**, not category).
- If code changes a documented decision, update the doc in the same commit.

## Tech Stack
- **UI** (`ui/`): React 19 + Vite + TypeScript on Node 24 (`.nvmrc`), MUI, TanStack Query, orval (generated API client), `vite-plugin-pwa`
- **API** (`api/`): ASP.NET Core (.NET 10, SDK pinned in `api/global.json`), controllers + orchestrators, EF Core + Npgsql, ProblemDetails errors, Scalar for browsing the OpenAPI doc
- **Database**: PostgreSQL in Docker Compose on host port **5433** (brew Postgres 14 already owns 5432). TablePlus → `localhost:5433`, user / password / database all `jot`.
- **Time zone**: fixed `America/Chicago` for "today" and "overdue".
- **Tests / CI**: xUnit + Testcontainers (API, real Postgres), Vitest (UI), ESLint, Prettier (UI), `dotnet format --verify-no-changes` (API) — all run by GitHub Actions (`.github/workflows/ci.yml`) on every PR and every push to `main` or `staging`. CI also fails on any compiler or ESLint warning, and if `Jot.Api.json`, the orval client, or an EF migration is out of date. CodeQL (a repo setting, not a required check) scans PRs for security bugs; Dependabot (`.github/dependabot.yml`) opens weekly dependency-update PRs into `staging`, merged like any other PR.
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
| UI format check | `npm run format:check` (`npm run format` to fix) |
| Regenerate the API client | `dotnet build` in `api/`, then `npm run generate` in `ui/` |
| Have Claude click through a PR | `/test-ui <PR number>` in Claude Code — hands the PR's Testing steps to the `ui-tester` agent, which runs them in the background and reports back; needs `npm install -g @playwright/cli@latest` once |
| Have agents build an issue | Start `claude` in the main folder, spawn a new session, then `/drive-issue start on issue <N>` (add `slot <S>` to pick one; otherwise it takes a free slot) — plans, builds test-first, reviews and opens the PR; stops for me after the plan and before the push. See Workflow below. Needs claude-setup's `install.sh` once |
| Clean up after a merged PR | `/close-out` in that issue's session (Parallel Workflow item 8) |

## Parallel Workflow
Up to about 3 agents work at once, each on its own issue, and I can run each one's app side by side.

1. **One agent = one worktree = one branch = one issue.** A worktree is an extra working folder that shares this repo's Git history. Sessions spawned from `claude` in the main folder create their own (or start one by hand with `claude -w <name>`). They live in `.claude/worktrees/<name>/`.
   - **Copy the issue into `ISSUE.md` when starting it** — at the worktree root, following `ISSUE-TEMPLATE.md`: the issue's contents and status, under a note that the file never merges. It's gitignored, so it can't be committed; GitHub stays the source of truth, so re-copy it if the issue changes.
2. **The main `jot/` folder is mine.** Agents never work in it. I keep it on `staging`, or check out an agent's branch there to try it.
3. **Branches follow the Git Workflow below** (`feature/…` / `fix/…` off `staging`). If an issue needs an unmerged branch, branch off that one and say so in the PR. New worktrees start from GitHub's default branch, `staging`, so push `staging` before starting agents that need recent commits.
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
   - "Auto mode classifier gave no verdict" on every shell command means Claude Code's safety check is down, not that the command is wrong. Commands matching a `permissions.allow` rule in `.claude/settings.json` skip that check, so routine git and `gh` keep working. Only I edit that file — Claude isn't allowed to grant itself permissions.
8. **Close out after the PR merges.** When I say the PR merged, the agent that built it (`/close-out` does these steps):
   1. Checks with `gh pr view` that the PR is merged and its issue closed.
   2. Deletes the branch on GitHub (`git push origin --delete <branch>`), unless GitHub already did.
   3. Removes its worktree and local branch (exit the worktree with "remove"). If it can't, it gives me `git worktree remove .claude/worktrees/<name>` and `git branch -d <branch>` to run from the main folder.

   Then I `git pull` on `staging` in the main folder. The slot's database stays for the next agent on that slot; to drop it, run `DROP DATABASE jot_N;` in TablePlus.

## Backlog / Next Steps

> **Rule:** Once an item below is fully done, remove it from this list.

Nothing yet.

## Development Flow (enforce these)
1. **Grill → plan → issues.** A phase's grilling session fills `PHASE-N.md`; `/to-issues` breaks it into vertical-slice GitHub issues — each one a thin, working path through database → API → UI → tests.
2. **Labels:** `ready-for-agent` = AFK, can be built and merged without me. `ready-for-human` = HITL, needs me (a review, a decision, or a manual step).
3. **Only pick up an unblocked issue** — check its "Blocked by" section first.
4. **One issue = one branch = one PR.** Never bundle slices together, and never put a whole phase in one PR.
5. **Link the PR to its issue:** `Closes #N` in the PR description (one keyword per issue: `Closes #4, closes #5`). Merging the PR into `staging` (the default branch) closes the issue — approving it doesn't, and neither does the later release to `main`.
6. **Trivial commits straight to `staging`** can close an issue the same way, with `Closes #N` in the commit message. On a feature branch the keyword does nothing until the commit reaches `staging`.
7. **The rulesets require green CI, not an approval** — GitHub doesn't let you approve your own PR, so requiring one would block every merge.

## Git Workflow (enforce these)
Two long-lived branches: **`staging`** (the default branch; everything lands here first) and **`main`** (prod). Every change reaches `main` by a release from `staging`. In phase 3 each deploys to its own hosted environment.

1. **Size decides the flow:**
   - **Trivial / quick changes → commit straight to `staging`, no branch, no PR.** Examples: typos, doc tweaks, a one-line fix, a small style nudge, a config or version bump.
   - **Medium or larger changes → branch + PR.** Examples: a new feature or page, logic/behavior changes, anything touching multiple files, anything with new tests.
   - When unsure, treat it as medium and branch.
2. For branch + PR work: create the branch off `staging` before the first commit. Naming: `feature/<short-desc>` for new work, `fix/<short-desc>` for bug fixes.
3. `git switch -c <branch>` carries uncommitted changes onto the new branch, so it's fine to branch after editing — just before the first commit.
4. Push with `git push -u origin <branch>`, then open a PR with `gh pr create` (it targets `staging`, the default). **The PR's title and body follow `.github/pull_request_template.md`**, including a `Closes #N` line for each issue it finishes. **A PR can't merge until CI is green** (the `staging` ruleset), and it's **squash-merged** — the only method `staging` allows — so its title becomes the one commit on `staging`. Do not merge without my go-ahead.
5. I'm on the `staging` ruleset's bypass list — that's what lets trivial commits go straight to `staging`. Never use the bypass to merge a PR with failing CI. `main` has no bypass, not even for me.
6. **Releasing to prod = a PR from `staging` into `main`** (`gh pr create --base main --head staging`), merged with a **merge commit** once CI is green and I say so. Only `staging` can merge into `main`: the `main` ruleset requires the **From staging** check (`.github/workflows/main-from-staging.yml`), which fails a PR from any other branch. Merge commits are the only method `main` allows: a squash commit would be on `main` but not `staging`, so the next release PR would conflict.
7. Only commit/push when I ask.
8. **Never credit Claude or AI anywhere** — no `Co-Authored-By` trailer in commits, no "Generated with Claude Code" line in PRs.

## Workflow
Read by /drive-issue, developer, reviewer, ui-tester and /close-out. Field names are defined in claude-setup/WORKFLOW.md: change values here, not names.

- **Base branch:** staging
- **Release branch:** main (PR from staging, merge commit; never by an agent)
- **Branch names:** feature/<short-desc>, fix/<short-desc>
- **Issue link:** Closes #N
- **Issue copy:** ISSUE.md from ISSUE-TEMPLATE.md (gitignored)
- **PR template:** .github/pull_request_template.md
- **AI credit:** never
- **Worktrees:** .claude/worktrees/<name>; never work in the main folder
- **Setup:**
  - `npm ci` (in ui/)
  - `dotnet tool restore` (in api/)
  - `dotnet restore` (in api/)
- **Checks:**
  - `dotnet format --verify-no-changes` (in api/)
  - `dotnet build -warnaserror -warnNotAsError:NU1901,NU1902,NU1903,NU1904` (in api/)
  - `dotnet ef migrations has-pending-model-changes --project Jot.Api --no-build` (in api/)
  - `dotnet test --no-build` (in api/; needs Docker)
  - `npm run lint` (in ui/)
  - `npm run format:check` (in ui/)
  - `npm test` (in ui/)
  - `npm run build` (in ui/)
  - `npm run generate` (in ui/), then `git status --porcelain -- ':/api/Jot.Api/Jot.Api.json' ':/ui/src/api/generated'` prints nothing
- **Tests first:** yes; where tests go is in .claude/rules/api.md and ui.md
- **Developer skills:** material-ui-styling
- **Run:** `./dev.sh <slot>`
- **Slots:** 0 = main folder; N = worktree → API 5080+N, UI 5173+N, DB jot_N
- **UI test:** `/test-ui` with the folder and slot
- **DB access:** `docker compose exec db psql -U jot -d jot_<slot>`
- **Review against:** CLAUDE.md, CONVENTIONS.md, CONTEXT.md, the issue
- **Gates:** after the plan; before push. Never merge.
- **Known traps:**
  - Worktree files have the macOS hidden flag, so appsettings doesn't load. For EF: `migrations remove --force`; `database update --connection "Host=localhost;Port=5433;Database=jot_<slot>;Username=jot;Password=jot"`. Never an env-var prefix, because allow rules can't match it.

## Conventions
@CONVENTIONS.md
