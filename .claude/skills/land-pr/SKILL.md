---
name: land-pr
description: Land a mathviz pull request (by default the standing "Sync from VisualMathLab" PR) -- address its review comments, catch docs/CHANGELOG drift the tests can't see, wait for CI, then squash-merge. Use when asked to merge, land, finish or review-and-merge a PR in this repository.
argument-hint: "[PR number]  (default: the open sync/from-visualmathlab PR)"
---

# Land a pull request

Nothing in this repository merges itself. A PR merges only after every step
below, in order. Never pass `--auto` or `--admin` to `gh pr merge`.

## 1. Find the PR and take it off auto-merge

```sh
gh pr list --head sync/from-visualmathlab --state open   # if no number was given
gh pr view <N> --json number,title,headRefName,autoMergeRequest,reviewRequests,mergeable
```

If `autoMergeRequest` is set, run `gh pr merge <N> --disable-auto`: it would
merge the moment CI goes green, before the review is done. Check out the head
branch and `git pull` it. If the working tree has unrelated changes, stop and
ask.

## 2. Wait for the review

Copilot reviews a few minutes after a PR opens or a push lands. If
`reviewRequests` still names a reviewer, or the latest push is newer than the
latest review, poll `gh pr view <N> --json reviews` every minute or two, for
up to ~10 minutes. If nothing arrives, go on and say so in the final report.

## 3. Triage every review comment

Collect all of them:

```sh
gh pr view <N> --json reviews,comments
gh api repos/apurvanakade/mathviz/pulls/<N>/comments   # inline comments
```

Only unresolved threads need handling. For each one, decide:

- **Relevant, and in a file authored here** (`docs/**`, `starter/**` except
  its `_extensions/` mirror, `CHANGELOG.md`, root Markdown, `.github/**`,
  `scripts/*.test.js`): fix it.
- **Relevant, but in a mirrored file** (`src/**`, `scripts/build.mjs`,
  `scripts/load-vm.mjs`, `package.json`, `_extensions/mathviz/{_extension.yml,mathviz.lua}`):
  do **not** edit it here, because the next sync overwrites it. Reply that the fix
  belongs in VisualMathLab's `_mathviz/`, and list it for the user. If it is a
  real bug, ask the user before merging.
- **Not relevant** (wrong, already handled, or style that contradicts
  CLAUDE.md, e.g. asking for `.map()` chains): don't change anything.

Reply to every thread with one line saying what was done, or why nothing
was (`gh api .../pulls/<N>/comments/<id>/replies -f body=...`). Resolve the
ones you fixed or declined, using the `resolveReviewThread` GraphQL mutation (look
up thread ids with `pullRequest.reviewThreads`). Leave the mirrored-file
threads open.

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
review comment and drift fix changed, and push. If the push starts a new
Copilot review, go back to step 2. Stop after two rounds and report whatever
is still open.

## 6. Wait for CI

```sh
gh pr checks <N> --watch --fail-fast
```

If a check fails, read the log (`gh run view <run-id> --log-failed`), fix it,
and go back to step 5. A failure in mirrored code is not fixed here: stop and
tell the user.

## 7. Merge

Only when every check is green, every thread is replied to, and no
mirrored-file bug is waiting on the user:

```sh
gh pr merge <N> --squash --delete-branch
gh pr view <N> --json state,mergeCommit
```

Report the result: the comments fixed, declined (with the reason) or left for
VisualMathLab, the drift fixed, and the merge commit.
