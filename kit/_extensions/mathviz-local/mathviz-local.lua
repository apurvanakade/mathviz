-- Copyright (c) 2026 Apurva Nakade. All rights reserved.
-- Released under Apache 2.0 license as described in the file LICENSE.
-- Authors: Apurva Nakade

-- Adds this site's additions to mathviz (dist/, built from _mathviz/ by
-- _mathviz/scripts/build.mjs) to every HTML page. List it after `mathviz`
-- under `filters:` in _quarto.yml: dependencies are emitted in the order
-- filters add them, so this bundle loads after mathviz.js and extends the
-- VM it defined.
--
-- Bump the version when dist/ changes: it names the
-- site_libs/quarto-contrib/mathviz-local-<version>/ folder, which is what
-- busts a returning reader's cache.
local VERSION = "0.1.0"

function Meta(meta)
  if not quarto.doc.is_format("html:js") then return nil end
  quarto.doc.add_html_dependency({
    name = "mathviz-local",
    version = VERSION,
    scripts = { "dist/mathviz-local.js" },
    stylesheets = { "dist/mathviz-local.css" }
  })
  return nil
end
