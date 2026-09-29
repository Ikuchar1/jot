<!--
TITLE: what this PR does, as an imperative sentence. If the PR is squash-merged, the title becomes the commit on main.
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
Issues close only when the PR merges into main. A PR based on another branch closes nothing when it merges.
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

## Try it
<!-- The steps to see it working. For an agent's PR, name its worktree and slot (see Parallel Workflow in CLAUDE.md). -->
1. `cd .claude/worktrees/<name> && ./dev.sh <slot>`
2. Open http://localhost:<UI port> and …

## Checks
<!-- Tick only what actually ran and passed. Delete lines that don't apply. If something failed or was skipped, leave it unticked and say why. -->
- [ ] `dotnet test`
- [ ] `dotnet format --verify-no-changes`
- [ ] `npm test`, `npm run lint`, `npm run build`
- [ ] API changed: `Jot.Api.json` and the orval client are regenerated and committed
- [ ] Schema changed: EF migration added with `dotnet ef migrations add`, not edited by hand
- [ ] A documented decision changed: the doc is updated in this PR

## Notes (optional)
<!-- What to look at closely, decisions made along the way, follow-ups left for later, screenshots of UI changes. -->
