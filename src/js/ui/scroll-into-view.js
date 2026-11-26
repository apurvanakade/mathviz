/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// A scroll a script makes to an element, ending with the element just below
// Quarto's fixed navbar in every mode -- the scroll the category cloud makes
// after a pick, or a site's own (a button that scrolls to a section).
//
// The browser's element.scrollIntoView() can't do that by itself. Where the
// smooth-scroll chrome is on and the reader allows motion, the root has a
// scroll-padding-top of the navbar's height, which scrollIntoView adds to
// the target's scroll-margin-top. Where it isn't (reduced motion,
// `smooth-scroll: false`, Quarto's own `smooth-scroll: true`, a blocked
// script) there is no padding: a same-page link gets its navbar room from
// Quarto's hashchange handler instead, which a scrollIntoView never fires.
// A site that gave its target a navbar-high scroll-margin-top got it right
// in one mode and one navbar off in the other, and a margin that differs by
// mode would leave a link to the same target one navbar off, since Quarto
// scrolls back on top of it.
//
// So this measures the navbar the way Quarto does (header.fixed-top's
// clientHeight, at call time) and scrolls the window with scrollTo, which
// no scroll-padding affects. The target's own scroll-margin-top still
// counts, as extra room beyond the navbar.
(function attachVM(globalThis) {
  /**
   * Scrolls the window so `element`'s top sits just below Quarto's fixed
   * navbar (`header.fixed-top`), plus the element's own `scroll-margin-top`.
   * The same place in every scroll mode -- with mathviz's smooth scroll on
   * or off, with or without reduced motion -- and the same place a
   * same-page link to the element ends. Use it instead of
   * `element.scrollIntoView()`; it changes neither the address nor history.
   *
   * Edge behaviour: on a page with no `header.fixed-top` the element's top
   * goes to the window's top (plus its `scroll-margin-top`). Only the window
   * scrolls: an element inside a scroll container of its own is not brought
   * into view within it. The target is clamped by the browser at the page's
   * ends, as any `scrollTo` is. `behavior` is not validated (the browser
   * treats an unknown value as `"auto"`).
   *
   * @param {Element} element - The element to bring into view.
   * @param {Object} [opts]
   * @param {ScrollBehavior} [opts.behavior="auto"] - Passed to `window.scrollTo`: `"auto"` follows the page (smooth where mathviz's smooth scroll animates, a jump with reduced motion), `"instant"` always jumps, `"smooth"` always animates.
   * @returns {void}
   * @throws {TypeError} When `element` is not an element (`null`, say, from
   *   a `getElementById` that found nothing); nothing scrolls.
   */
  const scrollIntoView = (element, {behavior = "auto"} = {}) => {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      throw new TypeError(`scrollIntoView: element must be an Element, got ${element === null ? "null" : typeof element}`)
    }
    const document = globalThis.document
    const header = document.querySelector("header.fixed-top")
    const navbar = header ? header.clientHeight : 0
    const margin = parseFloat(globalThis.getComputedStyle(element).scrollMarginTop) || 0
    const top = globalThis.scrollY + element.getBoundingClientRect().top - navbar - margin
    globalThis.scrollTo({top, behavior})
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {scrollIntoView})
})(window)
