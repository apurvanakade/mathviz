<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Site kit

Drop this into an existing Quarto site that uses mathviz:
**`update-mathviz.sh`**, a pre-render hook that installs the newest tagged
mathviz release *within the major version you have* (v1.x stays on v1.x)
into `_extensions/apurvanakade/mathviz/` before every render, so fixes and
new features arrive with no change on your side. A new major can change
APIs, so the hook only tells you about one; read the CHANGELOG, then render
once with `MATHVIZ_UPGRADE=1` to move to it. Offline, it keeps the installed
copy.

A brand-new site should start from [`starter/`](../starter/) instead.

## Install

```sh
git clone https://github.com/apurvanakade/mathviz /tmp/mathviz
cd my-site
rm -rf _extensions/mathviz    # a site copied from starter/ vendors one here; the hook manages its own copy
mkdir -p scripts
cp /tmp/mathviz/kit/update-mathviz.sh scripts/
```

Then, in `my-site/_quarto.yml`:

```yaml
project:
  pre-render: scripts/update-mathviz.sh

filters:
  - mathviz
```

To pin a release instead of tracking the latest, drop the pre-render hook and
run `quarto add apurvanakade/mathviz@vX.Y.Z`.

## Contributing back

mathviz is the one place its library code is written. A function your site
wrote that more than one site could use goes there as an ordinary pull
request, with its reference entry and a CHANGELOG line. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
