/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Every input on an app is URL-shareable: its default is read from the
  // query string, and a sync cell writes the current value back with
  // history.replaceState, so the address bar is always a link to what the
  // reader sees. Two things make that awkward on a lecture-notes page
  // rather than a one-app page: several apps share one query string (so
  // their keys carry a prefix), and a reader who never touches an app
  // shouldn't find ?pi_n=1000&pi_seed=1 appended to the chapter's URL.
  // syncUrlParams therefore drops any key whose value equals its default.

  /**
   * Reads one query-string parameter from the current URL, typed like its
   * fallback.
   *
   * @param {string} key
   * @param {(number|string|boolean)} fallback - Returned when the key is
   *   absent or doesn't parse. A number fallback parses the value with
   *   `Number` (non-finite results fall back); a boolean fallback accepts
   *   `"1"`/`"true"` and `"0"`/`"false"`; a string fallback returns the raw
   *   value.
   * @param {Object} [opts]
   * @param {string} [opts.search=location.search] - The query string to read.
   * @returns {(number|string|boolean)}
   */
  const urlParam = (key, fallback, opts = {}) => {
    const search = opts.search ?? globalThis.location.search
    const raw = new URLSearchParams(search).get(key)
    if (raw === null) return fallback
    if (typeof fallback === "number") {
      const value = Number(raw)
      if (raw.trim() === "" || !Number.isFinite(value)) return fallback
      return value
    }
    if (typeof fallback === "boolean") {
      if (raw === "1" || raw === "true") return true
      if (raw === "0" || raw === "false") return false
      return fallback
    }
    return raw
  }

  // Writes are throttled. The documented sync cell is reactive on the
  // inputs themselves, so a slider drag or a playback sweep calls this ~60
  // times a second -- and browsers cap the history API: Safari throws a
  // SecurityError past 100 replaceState calls in 10 seconds, Chrome
  // silently drops them ("Throttling navigation"). So the first change
  // after a quiet spell is written at once, later ones at most every
  // WRITE_INTERVAL_MS, and the last one always lands. `pending` holds the
  // query not yet written, so a second app's sync in between builds on it
  // rather than on the stale address bar.
  const WRITE_INTERVAL_MS = 250
  let pending = null
  let timer = null
  let lastWrite = -Infinity

  const now = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now())

  const write = () => {
    timer = null
    if (pending === null) return
    const query = pending
    pending = null
    lastWrite = now()
    const current = globalThis.location.search.replace(/^\?/, "")
    if (query === current) return
    let url = globalThis.location.pathname
    if (query !== "") url += "?" + query
    url += globalThis.location.hash
    // history.state, not null: a site's router (or Quarto's own scripts)
    // may keep state there, and replaceState replaces it too.
    globalThis.history.replaceState(globalThis.history.state ?? null, "", url)
  }

  /**
   * Writes the given inputs into the current URL's query string with
   * `history.replaceState` (no navigation, no history entry), leaving
   * every other key -- another app's, or mathviz's `embed` -- alone.
   *
   * Safe to call on every input event: an unchanged query is never
   * written, and writes are spaced at least 250 ms apart (the first at
   * once, the last always), which keeps a slider drag or playback sweep
   * under the browsers' history-API rate limits. `history.state` is kept.
   *
   * @param {Object<string, [*, *]>} entries - `{key: [value, default]}`. A
   *   key whose value equals its default (compared as strings) is removed
   *   rather than written.
   * @param {Object} [opts]
   * @param {string} [opts.search=location.search] - Start from this query
   *   string instead; the URL is then not touched.
   * @returns {string} The new query string, without the leading `?` (`""`
   *   when nothing is left). When writing, this is what the URL will hold
   *   once the pending write lands.
   */
  const syncUrlParams = (entries, opts = {}) => {
    const live = opts.search === undefined
    const search = live ? (pending ?? globalThis.location.search) : opts.search
    const params = new URLSearchParams(search)
    for (const key of Object.keys(entries)) {
      const [value, fallback] = entries[key]
      if (String(value) === String(fallback)) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    if (!live) return query
    pending = query
    if (timer !== null) return query
    const wait = WRITE_INTERVAL_MS - (now() - lastWrite)
    if (wait <= 0) write()
    else timer = setTimeout(write, wait)
    return query
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {urlParam, syncUrlParams})
})(window)
