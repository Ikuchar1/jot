---
name: test-ui
description: Sends a Jot PR's Testing steps to the ui-tester subagent, which walks them in Chrome with playwright-cli, then presents its pass/fail report. Use when the user runs /test-ui or asks to test, try or click through the UI, run a PR's Testing steps, or check a change in the browser.
argument-hint: "[PR number, or what to test] [extra asks]"
---

# Test the UI

Hand the testing to the `ui-tester` subagent, then bring its report back.

1. **Pin what to test** from `$ARGUMENTS` and the conversation:
   - A PR number, or with none, this branch's open PR (`gh pr view --json number -q .number`). The agent reads the PR's Testing steps itself.
   - No PR, but a change or steps in the conversation: write the steps out the way `.github/pull_request_template.md` says. The agent can't see the conversation, so they go in the brief in full.
   - If it's still unclear what to test, ask.

2. **Pin the slot.** The agent finds it in the steps' Setup or the folder's `ISSUE.md`. If neither names one and the conversation doesn't either, ask the user which slot is free. Don't guess: another worktree may own it.

3. **Spawn `ui-tester`** with a brief made of pointers:
   - What to test: the PR number, or the steps in full.
   - The folder and slot, if you know them.
   - Extra asks from `$ARGUMENTS`, verbatim, like watching the browser or only phone width.

   Leave out how the change was built and what you expect to pass. The agent should use the app the way the steps say, not look for what you predicted. It runs in the background: tell the user it's started, then carry on with the conversation.

4. **Present the report** when it comes back: the folder and slot, then every check in every scenario as ✅, ❌ or ⚠️ (not checked, and why). For each ❌, what the agent saw and its screenshot path. Where a ❌ looks like a setup problem rather than a bug (wrong slot, app didn't start), say so in one line.

5. **Don't tick the PR's checkboxes or edit the PR**, even when every check passed. The user ticks them as they test it by hand.
