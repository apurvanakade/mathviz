---
name: land-pr
description: Land a mathviz pull request (by default the one for the current branch) -- address its review comments (Copilot's, or a local maintainer agent's when Copilot is out of credits), catch docs/CHANGELOG drift the tests can't see, wait for CI, then squash-merge. Use when asked to merge, land, finish or review-and-merge a PR in this repository.
argument-hint: "[PR number]  (default: the current branch's PR)"
---

# Land a pull request

Nothing in this repository merges itself. A PR merges only after every step
below, in order. Never pass `--auto` or `--admin` to `gh pr merge`.

## 1. Find the PR and take it off auto-merge

```sh
gh pr view --json number                                 # if no number was given: the current branch's PR
gh pr view <N> --json number,title,headRefName,autoMergeRequest,reviewRequests,mergeable
```

If `autoMergeRequest` is set, run `gh pr merge <N> --disable-auto`: it would
merge the moment CI goes green, before the review is done. Check out the head
branch and `git pull` it. If the working tree has unrelated changes, stop and
ask.

## 2. Wait for the review

Copilot reviews a few minutes after a PR opens, once only: pushes to the PR
don't bring a new review (the ruleset has re-review on push off, to save
Copilot quota). If the PR has no review yet, poll `gh pr view <N> --json
reviews` every minute or two, for up to ~10 minutes. If nothing arrives, go
on and say so in the final report.

### 2b. Copilot out of credits: a local maintainer review instead

When Copilot's quota runs out it still posts a review, with no findings and
this body: *"Copilot was unable to review this pull request because the user
who requested the review has reached their quota limit."* Check for it:

```sh
gh pr view <N> --json reviews \
  -q '.reviews[] | select(.author.login | startswith("copilot")) | .body' \
  | grep -i "unable to review"
```

If it matches, run a local review in Copilot's place:

1. Spawn a fresh `general-purpose` agent (the Agent tool, not a fork, so it
   starts without this session's context) with the prompt in
   [maintainer-review.md](maintainer-review.md), filling in the PR number and
   the folder holding the PR's head branch. Add nothing about the change: the
   point is a reviewer who knows the codebase but not the reasoning behind
   this work, the way a maintainer reading the PR cold would. Run it in the
   foreground; the next step needs its answer.
2. Post its findings on the PR as one review, so they become threads the same
   as Copilot's would. Write the payload to the scratchpad and send it:

   ```sh
   gh api repos/apurvanakade/mathviz/pulls/<N>/reviews --input review.json
   ```

   with `{"event": "COMMENT", "body": "Local maintainer review (Copilot out of credits).\n\n<VERDICT line>", "comments": [{"path": ..., "line": ..., "side": "RIGHT", "body": "**<severity>**: <comment>"}, ...]}`.
   A finding whose line isn't part of the diff can't be an inline comment
   (the API rejects the whole review); put it in `body` instead, as
   `` `path:line` -- comment ``. With no findings, post the verdict alone.
3. Go on to step 3 and triage these threads exactly like Copilot's. The agent
   read CLAUDE.md, so a finding that contradicts it is rarer than with Copilot,
   but it can still be wrong: check each one against the code. Its docs
   findings overlap step 4's drift pass; that pass still runs in full.

## 3. Triage every review comment

Collect all of them:

```sh
gh pr view <N> --json reviews,comments
gh api repos/apurvanakade/mathviz/pulls/<N>/comments   # inline comments
```

Only unresolved threads need handling. For each one, decide:

- **Relevant**: fix it. Generated files (`dist/`, `_extensions/mathviz/dist/`,
  `starter/_extensions/`) are fixed at the source and rebuilt, never by hand.
  If the fix changes library behaviour beyond what the PR set out to do, ask
  the user before merging.
- **Not relevant** (wrong, already handled, or style that contradicts
  CLAUDE.md, e.g. asking for `.map()` chains): don't change anything.

Reply to every thread with one line saying what was done, or why nothing
was (`gh api .../pulls/<N>/comments/<id>/replies -f body=...`). Resolve the
ones you fixed or declined, using the `resolveReviewThread` GraphQL mutation (look
up thread ids with `pullRequest.reviewThreads`).

## 4. Drift pass: what the tests can't see

`docs-coverage` checks that `VM.*` members have headings, and `css-coverage`
checks that every token and class has a heading or table row. Neither checks
that the prose describing them is still true. Read the diff against `main`:

```sh
git diff origin/main...HEAD -- src/
```

For each change, check the pages that describe it:

| Changed | Check |
|---|---|
| `src/css/tokens.css` | `docs/theming.qmd` token table: value, "Used for" text; dark-mode section if the selector list moved |
| `src/css/panel.css`, `chart-block.css`, `sliders.css`, `legend-controls.css`, `table.css` | `docs/markup.qmd` (sizes, widths, behaviour of `ojs-*` classes), `docs/troubleshooting.qmd` |
| any class/property the library writes itself | `docs/reference/internals.qmd#generated-classes` |
| a JSDoc signature, default or return shape | that member's entry in `docs/reference/<category>.qmd` |
| `_extensions/mathviz/mathviz.lua`, `_extension.yml` | `docs/install.qmd`, `README.md` |
| version bump | install snippets in `docs/` and `README.md`; move `[Unreleased]` in `CHANGELOG.md` under the new version |
| anything user-visible | a `CHANGELOG.md` `[Unreleased]` entry (CI's `changelog` job fails without one) |

Numbers in prose (px, em, ratios) are the usual thing to go stale. Grep the
docs for the old value from the diff. Keep technical detail out of the guide
pages. It belongs in the reference and `internals.qmd` (see CLAUDE.md).

## 5. Verify, commit, push

```sh
npm run check
quarto render            # if docs/ changed
quarto render starter    # if starter/ changed
```

Commit the fixes on the PR branch, with one message that lists what each
review comment and drift fix changed, and push. The push brings no new
review, so this is a single round.

## 6. Wait for CI

```sh
gh pr checks <N> --watch --fail-fast
```

If a check fails, read the log (`gh run view <run-id> --log-failed`), fix it,
and go back to step 5. If the fix would change library behaviour beyond the
PR's scope, stop and tell the user.

## 7. Merge

Only when every check is green, every thread is replied to, and nothing is
waiting on the user:

```sh
gh pr merge <N> --squash --delete-branch
gh pr view <N> --json state,mergeCommit
```

## 8. Delete the old branch

A squash merge leaves the branch out of `main`'s history, so `git branch -d`
refuses and `--delete-branch` can leave a copy behind. Once the merge is
confirmed, remove the branch everywhere:

```sh
git checkout main && git pull
git branch -D <head-branch>                          # local
git push origin --delete <head-branch> 2>/dev/null   # remote, if the merge left it
git fetch --prune
```

Report the result: who reviewed it (Copilot or the local maintainer agent), the comments fixed or declined (with the reason), the
drift fixed, the merge commit, and the branch deleted. For a release PR, also
confirm `tag-release.yml` tagged the version (`gh run list -w "Tag release"`).
