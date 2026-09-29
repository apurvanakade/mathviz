<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Site kit

Drop this into an existing Quarto site that uses mathviz. You get two
things:

- **`update-mathviz.sh`**, a pre-render hook that installs the latest tagged
  mathviz release into `_extensions/apurvanakade/mathviz/` before every
  render, so new releases arrive with no change on your side. Offline, it
  keeps the installed copy.
- **`_mathviz/` + `_extensions/mathviz-local/`**, a local overlay for
  functions and CSS your site adds on top of mathviz. It's laid out exactly
  like mathviz's `src/`, so anything that turns out to be generally useful
  moves upstream as a file copy (see `_mathviz/README.md`).

A brand-new site should start from [`starter/`](../starter/) instead. Add
this kit once the site needs functions of its own.

## Install

```sh
git clone https://github.com/apurvanakade/mathviz /tmp/mathviz
cd my-site
mkdir -p scripts _extensions
cp /tmp/mathviz/kit/update-mathviz.sh scripts/
cp -R /tmp/mathviz/kit/_mathviz .
cp -R /tmp/mathviz/kit/_extensions/mathviz-local _extensions/
```

Then, in `my-site/_quarto.yml`:

```yaml
project:
  pre-render: scripts/update-mathviz.sh

filters:
  - mathviz          # the release: math.js, Plotly, mathviz.js, mathviz.css
  - mathviz-local    # your additions, loaded after it
```

Order matters. `mathviz-local` must come second so its bundle extends the
`VM` that mathviz defined. To pin a release instead of tracking the latest,
drop the pre-render hook and run `quarto add apurvanakade/mathviz@vX.Y.Z`.

## Contributing back

mathviz is the one place its library code is written. A function that more
than one site could use goes there as an ordinary pull request, with its
reference entry and a CHANGELOG line. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
