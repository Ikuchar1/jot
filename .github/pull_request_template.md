<!--
TITLE: what this PR does, as an imperative sentence. PRs into staging are squash-merged, so the title becomes the commit on staging.
  - Start with a verb: "Add quick-add for Todos", "Fix overdue Todos showing under Today"
  - Keep it under about 70 characters, with no trailing period, no issue number and no "feat:" prefix
  - Use the glossary's words: Todo (not task), List (not category)

BODY: fill in each section and delete these comments. Delete a section marked (optional) if it doesn't apply.
Never credit Claude or AI; no "Generated with Claude Code" line.
-->

Closes #

<!--
One keyword per issue, each on its own line. "Closes #4, #5" only closes #4.
  Closes #4
  Closes #5
Use "Part of #N" for an issue this PR works on but doesn't finish. That links the issue without closing it.
Issues close only when the PR merges into staging, the default branch. A PR based on another branch closes nothing when it merges.
A release PR (staging → main) has no Closes line: its issues closed when they reached staging.
-->

## What and why
<!-- 1–3 sentences: what I can do now that I couldn't before, and why it's built this way if that isn't obvious. -->

## Changes
<!-- Bullets grouped by area. Say what changed, not how every line works. Delete the areas that didn't change. -->
**API**
-

**UI**
-

**Docs / tooling**
-

## Testing steps
<!--
How I check this PR by hand, using the app the way I would. Not the test suites; those go under Checks.
Write it for someone who hasn't read the code. Take every name from the code, not memory: page, button and field
labels from the components, routes from the controllers, tables and columns from the migrations.

Size it to the change: a one-line fix might be one scenario with two checks. Pick from this list; don't fill it:
  - each acceptance criterion in the issue
  - the error path, if there is one: bad input, a failed request, an empty state
  - an edge case worth a look (a very long title; a Todo due today, just before midnight Central time)
  - one nearby flow this change could break, to show it still works
  - for a UI change, the main steps again at phone width (DevTools device toolbar), since Jot runs as a PWA on my phone
For a bug fix, the first scenario reproduces the bug on staging (the main folder, slot 0), then shows it's fixed here.

Setup: start from an empty slot database, so a DB check can't find rows from an earlier run. Then list any data to
create first, with real values ("a List named School"), not "some data". For an agent's PR, name its worktree and
slot (see Parallel Workflow in CLAUDE.md).

Scenarios: one ### heading per thing to check, named for the outcome. Steps: numbered, one action each. Under a step,
a "- [ ]" check for each thing I should see. Leave them unticked: they're mine to tick as I test. A check is in the
UI unless it's tagged:
  - **API:** a request to send in Scalar, then the status code and the part of the response that matters
  - **DB:** a SQL query to run in TablePlus, then the rows it should return
Check the DB whenever a step saves, moves or deletes something: the UI can look right while the row is wrong.
Refresh the page whenever a change should persist.
To make a request fail, send bad input for a real error response, or use DevTools → Network → Offline for a network
failure. Don't say to stop the API: Ctrl+C in dev.sh stops the UI too.

Example, after Setup created a List named School:
  ### Move a Todo to another List
  1. Open the Inbox List and add a Todo `Buy milk`
     - [ ] It shows under Anytime
  2. Open `Buy milk`, change its List to School, and save
     - [ ] It disappears from Inbox
  3. Open the School List
     - [ ] `Buy milk` shows under Anytime
     - [ ] **DB:** `select t.title, l.name from todos t join todo_lists l on l.id = t.todo_list_id where t.title = 'Buy milk';` returns one row: `Buy milk`, `School`
  4. Refresh the page
     - [ ] `Buy milk` is still on School

Nothing to click (docs, CI, tooling): say how to see it working instead, e.g. "this PR's CI checks go green".
If a later commit changes the behavior, update the steps.
-->
**Setup**
1. `cd .claude/worktrees/<name>`, then empty the slot's database: `docker compose up -d --wait && docker compose exec db dropdb -U jot --force --if-exists jot_<slot>`
2. `./dev.sh <slot>` recreates and migrates it: UI at http://localhost:<5173 + slot>, Scalar at http://localhost:<5080 + slot>/scalar, TablePlus at `localhost:5433`, database `jot_<slot>`
3. Data to create first

### The outcome being checked
1. One action
   - [ ] What I should see

## Checks
<!-- Tick only what actually ran and passed. Delete lines that don't apply. If something failed or was skipped, leave it unticked and say why. -->
- [ ] `dotnet test`
- [ ] `dotnet format --verify-no-changes`
- [ ] `npm test`, `npm run lint`, `npm run format:check`, `npm run build`
- [ ] API changed: `Jot.Api.json` and the orval client are regenerated and committed
- [ ] Schema changed: EF migration added with `dotnet ef migrations add`, not edited by hand
- [ ] A documented decision changed: the doc is updated in this PR

## Notes (optional)
<!-- What to look at closely, decisions made along the way, follow-ups left for later, screenshots of UI changes. -->
