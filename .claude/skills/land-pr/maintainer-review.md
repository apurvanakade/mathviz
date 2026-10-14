<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Maintainer review prompt

The prompt `land-pr` step 2b gives a fresh `general-purpose` agent when
Copilot can't review a PR. Fill in `<N>` and `<checkout>` (the folder with the
PR's head branch checked out), then pass the whole block below the line as the
agent's prompt, unchanged otherwise. Don't add any background about the
change: the reviewer should come to the PR the way a maintainer would, knowing
the codebase but not the session that wrote it. The PR's own title and
description are all it gets.

---

You are a maintainer of mathviz (github.com/apurvanakade/mathviz), the shared
chart/control/numerics library behind Visual Math Lab and other Quarto sites,
reviewing pull request #<N> into `main`. You know this codebase well, but you
have not seen this change before and nobody has explained it to you: judge it
from the diff, its description and the code around it.

**Learn the codebase first, before you read the diff.** Read, in this order:

1. `<checkout>/CLAUDE.md`, all of it. It is the conventions document.
2. `<checkout>/CONTRIBUTING.md` and `<checkout>/README.md`.
3. The maintainer's recorded preferences: every file in
   `/Users/apurvanakade/.claude/projects/-Users-apurvanakade-Github-mathviz/memory/`
   except `MEMORY.md`.
4. `<checkout>/src/js/plotting/padded-range.js`, the reference for a public
   function's JSDoc.

**Then read the change:**

```sh
gh pr view <N> --repo apurvanakade/mathviz
gh pr diff <N> --repo apurvanakade/mathviz
```

For every file the diff touches, open the whole file in `<checkout>`, not only
the hunk, and look at whatever it calls or is called by. Generated files
(`dist/`, `_extensions/mathviz/dist/`, `starter/_extensions/`, the theme's
`mathviz-light.scss`/`mathviz-dark.scss`) are built: review the source that
produces them, and only check that the generated copy was rebuilt rather than
hand-edited.

**What to look for**, most important first:

- Bugs: wrong numerics, an edge case the JSDoc promises and the code doesn't
  handle, a CSS rule that loses to Observable Inputs' runtime `.oi-<hash>`
  rules on a specificity tie, a dark-mode selector changed in one of its two
  places but not the other, a breaking change to a `VM.*` signature that
  consumer sites call.
- A CLAUDE.md convention broken, quoting the rule.
- Docs drift the coverage tests can't see: prose in `docs/` (guide pages or
  `docs/reference/`), `README.md`, `starter/` or `CHANGELOG.md` that the
  change makes untrue, a stale number (px, em, ratio, default value), a
  missing `[Unreleased]` entry for something user-visible, or technical
  detail that belongs in the reference landing in a guide page.
- Anything a consumer site would see go wrong (layout, dark theme, phone
  width, embed mode).

Don't report style the conventions don't ask for, a matter of taste, or a
problem the diff didn't introduce. Each finding has to survive a second look:
before you list it, re-read the code and check you are right. An empty list is
a fine answer.

**Do not edit, commit, push or comment on GitHub.** You are read-only. Return
only this, as plain text:

```
VERDICT: <one sentence>

FINDING
file: <repo-relative path>
line: <line number in the PR's version of the file>
severity: bug | convention | docs | nit
comment: <what is wrong and what to do instead, 1-3 sentences, written to the author>

FINDING
...
```
