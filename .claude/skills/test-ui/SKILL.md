---
name: test-ui
description: Runs a Jot PR's Testing steps in a real browser with playwright-cli, against that PR's worktree and slot, and reports each check as pass or fail. Use when the user asks to test, try or click through the UI, run a PR's Testing steps, or check a change in the browser.
argument-hint: "[PR number, or Testing steps]"
context: fork
---

# Test the UI

You run as a background subagent: you can't see the user's conversation or ask them anything. Walk a PR's Testing steps in Chrome with `playwright-cli`, then end with the report, since your final message is all the user gets back. The global `playwright-cli` skill has the full command list.

**What to test:** $ARGUMENTS

That's a PR number, or Testing steps written out. If it's empty, test the open PR for this folder's branch (`gh pr view --json number -q .number`).

## 1. Find the steps, the folder and the slot

- **Steps:** the PR's `## Testing steps` section, from `gh pr view <N> --json body -q .body`, or the steps given above. If there are none, write them from `ISSUE.md`'s acceptance criteria the way `.github/pull_request_template.md` says, and say in the report that you wrote them.
- **Folder:** for a PR, the worktree with its branch checked out. `gh pr view <N> --json headRefName -q .headRefName` gives the branch, and `git worktree list` shows which folder has it. Without a PR number, this folder. Run everything below from that folder, so you test the PR's code and not `staging`'s. If no folder has the branch, stop and report that. Never switch branches in the main `jot/` folder: it's the user's.
- **Slot:** the one the steps' Setup names, else the Slot row in that folder's `ISSUE.md`, else 0 for the main folder. If none of those gives one, stop and report it. Don't pick a slot yourself: another worktree may own it.
- **Addresses:** UI `http://localhost:<5173 + slot>`, API `http://localhost:<5080 + slot>`, database `jot_<slot>` (`jot` for slot 0).

## 2. Start the app

1. If the UI port already answers, check it's the PR folder's app, not another worktree's. `lsof -tiTCP:<ui port> -sTCP:LISTEN` prints its pid, then `lsof -a -p <pid> -d cwd` must print that folder's `ui/`. Run them as two commands; worktree sessions refuse a command built from another's output. If it is, reuse it and skip to step 5. The database then isn't empty, so say in the report that DB checks may find older rows.
2. Otherwise follow the steps' Setup: drop the slot's database, then start `./dev.sh <slot>` from the folder root as a background command. Never drop `jot`: slot 0's database holds the user's own data.
3. Wait until `curl -sf -o /dev/null http://localhost:<ui port>` succeeds. A first run restores packages and migrates, so allow up to 3 minutes.
4. If `dev.sh` fails with `NETSDK1004` (assets file not found), the worktree is new: run `dotnet restore` in `api/` once, then start it again.
5. Create the Setup's data through the UI, the way the steps say.

## 3. Walk each scenario

Name the browser session after the PR's folder (`-s=<folder name>` on every command), so agents running in parallel don't share a browser. Add `--headed` to `open` only if the request above asks to watch.

```bash
playwright-cli -s=<name> open http://localhost:<ui port>
playwright-cli -s=<name> snapshot                      # read element refs, then act on them
playwright-cli -s=<name> fill e5 "Buy milk" --submit   # --submit presses Enter
playwright-cli -s=<name> find "Buy milk"               # a UI check
```

Do one numbered step at a time, then check every `- [ ]` under it:

- **UI check:** `snapshot` or `find` the text. Take labels from the page, not from memory. Refs change after a reload (`e8` becomes `f1e8`), so read them again.
- **Before a refresh:** confirm the change reached the API. `playwright-cli -s=<name> requests --filter "/api/"` must show the POST, PUT or DELETE with a 2xx. Jot shows a change before the API saves it, so reloading too early loses it and looks like a bug. One `ERR_ABORTED` GET per page load is React's StrictMode in dev, not a failure.
- **API check:** send the request with `curl` to the API address instead of using Scalar, then compare the status and the part of the body the check names.
- **DB check:** `docker compose exec db psql -U jot -d jot_<slot> -c "<the check's SQL>"`, run from the folder root.
- **A failed request:** don't use DevTools → Offline, even if the step says to. TanStack Query holds requests until the connection is back instead of failing them. Fake the failure for just the method the step needs, then remove it when the scenario ends:

  ```bash
  playwright-cli -s=<name> run-code "async page => { await page.route('**/api/todos', r => r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/problem+json', body: '{\"title\":\"Server error\"}' }) : r.continue()) }"
  playwright-cli -s=<name> run-code "async page => { await page.unrouteAll() }"
  ```

  For a network failure rather than an error response, use `r.abort('internetdisconnected')` in place of `r.fulfill(...)`.
- **Phone width:** run the steps again in a second session: `playwright-cli -s=<name>-phone open <ui address> --device="Pixel 7"`.
- **A check fails:** save `playwright-cli -s=<name> screenshot --filename=.playwright-cli/<scenario>-fail.png` (a bare filename lands in the folder root, outside the gitignored folder), read `console` for errors, and go on to the next scenario.

## 4. Clean up and report

1. Close the browsers: `playwright-cli -s=<name> close`, and the same for `<name>-phone` if you opened it.
2. If you started `dev.sh`, stop it: `pgrep -f 'dev\.sh <slot>$'` prints its pid, then `kill -TERM <pid>`. Its trap then stops the API and Vite; `kill -9` skips the trap and leaves them running. Exit code 143 is that SIGTERM, not a failure.
3. Report each scenario as its list of checks, each ✅ or ❌. For a ❌, say what you saw instead and give the screenshot path.
4. Don't tick the PR's checkboxes or edit the PR. They're the user's to tick as they test.
