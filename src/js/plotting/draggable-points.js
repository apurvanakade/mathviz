/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Points on a Plotly chart that the reader drags, as an OJS view: the
  // chart's div carries `value` and fires `input` on every move, so cells
  // react to a point the way they react to a slider.
  //
  // Each point is a real element laid over the chart (role="slider",
  // focusable), not a Plotly marker: that is what gives it a keyboard, an
  // accessible name and a focus ring, and lets it move at the pointer's rate
  // without a redraw. Its color is a CSS value (a var(--vm-color-*) token by
  // default), so a theme toggle recolors it without re-running the cell --
  // re-running it would reset the point.
  //
  // Pixels and data are converted through the axis objects in
  // `_fullLayout` (`_offset`, `_length`, `d2l`/`l2p`/`p2l`/`l2d`), the same
  // internals lockedAxes and anchored-view.js already read, and kept in this
  // one file. Not by measuring Plotly's `.nsewdrag` rect, which happens to
  // cover the plot area but is a drag-layer implementation detail; the axis
  // converters also handle log and reversed axes for free.
  //
  // Touch: only the points themselves have `touch-action: none`. A touch
  // that starts anywhere else on the chart still scrolls the page, so a
  // full-width chart on a phone can't trap the reader. With `jump`, a press
  // elsewhere on the plot area moves the nearest point there -- a mouse
  // press also keeps dragging it, a touch moves it on a tap (a swipe stays a
  // scroll, which the browser reports as `pointercancel`).
  //
  // With `add`, the same press on the plot area adds a point there instead,
  // and with `remove` a double-click (or Delete on a focused point) takes one
  // away: points the reader places, as in a regression demo. A `"change"`
  // event follows each finished edit -- a drag released, a key press, a point
  // added or removed -- the way a native range fires `input` while it moves
  // and `change` when it lets go, so a page can redo slow work (a fitted
  // window, a refit axis) once per gesture rather than on every frame.

  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

  // A pixel in the plot area -> a data value on one axis, and back.
  const toData = (axis, px) => axis.l2d(axis.p2l(px))
  const toPixel = (axis, value) => axis.l2p(axis.d2l(value))

  // The data interval an axis shows, low end first (a reversed axis has
  // range[0] > range[1]).
  const visibleRange = (axis) => {
    const a = toData(axis, 0)
    const b = toData(axis, axis._length)
    return [Math.min(a, b), Math.max(a, b)]
  }

  const axisKey = (id) => {
    const match = /^([xy])(\d*)$/.exec(id)
    if (!match) throw new TypeError(`draggablePoints: "${id}" is not an axis id like "x" or "y2"`)
    if (match[2] === "" || match[2] === "1") return `${match[1]}axis`
    return `${match[1]}axis${match[2]}`
  }

  const significant = (value) => String(Number(value.toPrecision(3)))

  const defaultFormat = (point) => `x ${significant(point.x)}, y ${significant(point.y)}`


  const copyPoint = (point) => ({x: Number(point.x), y: Number(point.y)})

  /**
   * Draggable points on a Plotly chart, as an OJS view. Call it in a
   * `viewof` cell that depends on nothing that changes with the theme, and
   * draw the chart's traces from a separate cell with the same `plot`.
   * The view's value has the shape of `opts.value`: one point gives `{x, y}`,
   * an array gives an array.
   *
   *     viewof drop = VM.plotting.draggablePoints(regionPlot, {
   *       value: {x: 0.87, y: 0.42}, xBounds: [0, Math.PI], yBounds: [0, 0.5]
   *     })
   *     viewof corners = VM.plotting.draggablePoints(trianglePlot, {
   *       value: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0.5, y: 0.9}]
   *     })
   *
   * Each point is a focusable element over the chart: drag it with a mouse,
   * pen or finger, or focus it (Tab) and move it with the arrow keys
   * (Shift for ten steps). It never leaves its bounds, even when the
   * pointer leaves the chart. Calling it again on the same chart replaces
   * the previous points.
   *
   * @param {Function|HTMLElement} plot - A chart function such as
   *   `VM.plotting.persistentPlot()`'s return value (its `div` is used as
   *   is; only a chart not drawn yet is drawn once, empty, to get one), or
   *   a div Plotly has already drawn.
   * @param {Object} opts
   * @param {{x: number, y: number}|{x: number, y: number}[]} opts.value -
   *   Starting position of one point, or of each of several.
   * @param {[number, number]} [opts.xBounds] - Where the points may go
   *   horizontally, in data units; the x-axis's visible range by default.
   * @param {[number, number]} [opts.yBounds] - The same, vertically.
   * @param {(point: {x, y}, index: number, points: {x, y}[]) => {x, y}}
   *   [opts.constrain] - Applied after the bounds on every move, with the
   *   points as they were before it (an array even for one point): return
   *   where the point may go instead (inside a triangle, snapped to a
   *   grid). Its result is not re-clamped.
   * @param {{x?: number, y?: number}} [opts.step] - One arrow-key step, in
   *   data units; a hundredth of the bounds' span by default.
   * @param {boolean} [opts.jump=false] - Let a press anywhere on the plot
   *   area move the nearest point there (a tap, on a touch screen). This
   *   takes the plot area's pointer events from Plotly, so its hover and
   *   drag-to-zoom stop working there.
   * @param {boolean} [opts.add=false] - Let a press on the plot area away
   *   from the points add one there (a tap, on a touch screen; a mouse
   *   press keeps dragging the new point). Takes the plot area's pointer
   *   events like `jump`, and can't be combined with it. Needs an array
   *   `value`.
   * @param {boolean} [opts.remove=false] - Let a double-click on a point,
   *   or Delete/Backspace while it has focus, remove it. Needs an array
   *   `value`.
   * @param {number} [opts.minPoints=0] - `remove` stops at this many.
   * @param {number} [opts.maxPoints=Infinity] - `add` stops at this many.
   * @param {string|string[]} [opts.label="Point"] - Accessible name. With
   *   an array `value`, a single string is numbered ("Point 1", ...) and an
   *   array names each point; a name stays with its point when `remove`
   *   takes an earlier one, and a point `add` puts past the array is
   *   numbered "Point <n>".
   * @param {(point: {x, y}, index: number) => string} [opts.format] - What
   *   a screen reader announces as the value; `"x 0.87, y 0.42"` (three
   *   significant digits) by default.
   * @param {string|string[]} [opts.color="var(--vm-color-fn)"] - CSS color
   *   of the points, or one per point (kept with its point across a
   *   `remove`; an added point past the array takes the default). Use a `var(--vm-color-*)` token to
   *   follow the theme; a resolved color (`chartColors.fn`) would not.
   * @param {string} [opts.xaxis="x"] - Axis id the points live on, for a
   *   chart with several subplots.
   * @param {string} [opts.yaxis="y"]
   * @returns {HTMLElement} The chart's div, with a `value` accessor (a copy,
   *   `{x, y}` or `{x, y}[]` like `opts.value`; setting an array of another
   *   length rebuilds the points) that dispatches a bubbling `"input"` event
   *   on every move by the reader -- not on a programmatic set, matching
   *   Observable Inputs -- and a bubbling `"change"` event once each edit
   *   is finished: a drag released (if it moved anything), an arrow-key
   *   move, a point added or removed.
   * @throws {TypeError} When `plot` gives no drawn Plotly div,
   *   `opts.value` is missing, `add` is combined with `jump`, or `add` or
   *   `remove` is given a single point.
   */
  const draggablePoints = (plot, opts = {}) => {
    if (opts.value === null || typeof opts.value !== "object") {
      throw new TypeError("draggablePoints needs opts.value: a point {x, y}, or an array of them")
    }
    // One point in, one point out; the code below always works on a list.
    const single = !Array.isArray(opts.value)
    if (opts.add && opts.jump) {
      throw new TypeError("draggablePoints: `add` and `jump` both claim a press on the plot area; use one")
    }
    if (single && (opts.add || opts.remove)) {
      throw new TypeError("draggablePoints: `add` and `remove` need an array `value`")
    }
    const minPoints = opts.minPoints ?? 0
    const maxPoints = opts.maxPoints ?? Infinity

    // The chart's existing div when it has been drawn -- calling the plot
    // function with no traces would redraw it empty (and reset the reader's
    // zoom) until the drawing cell ran again. Only a chart not drawn yet is
    // drawn here, empty, so the points have axes to sit on.
    let gd = plot
    if (typeof plot === "function") gd = plot.div ?? plot([], {})
    if (!gd || !gd._fullLayout || typeof gd.on !== "function") {
      throw new TypeError("draggablePoints needs a drawn Plotly chart: a persistentPlot() function or a div Plotly.newPlot has drawn into")
    }

    // A second call on the same chart (the cell re-ran) replaces the first.
    if (gd.__vmDragPoints) gd.__vmDragPoints.detach()

    const xKey = axisKey(opts.xaxis ?? "x")
    const yKey = axisKey(opts.yaxis ?? "y")
    const format = opts.format ?? defaultFormat
    const listeners = new AbortController()
    const signal = listeners.signal

    let points = []
    if (single) points = [copyPoint(opts.value)]
    else points = opts.value.map(copyPoint)
    // Array labels and colors belong to their points: a remove splices them
    // out with it, so the survivors keep theirs, and an added point gets the
    // fallbacks. A single string is numbered by position instead.
    const names = Array.isArray(opts.label) ? [...opts.label] : null
    const colors = Array.isArray(opts.color) ? [...opts.color] : null

    const layer = document.createElement("div")
    layer.className = "vm-drag-layer"
    let pad = null
    let handles = []
    gd.classList.add("vm-drag-host")
    gd.append(layer)

    const axes = () => {
      const xa = gd._fullLayout?.[xKey]
      const ya = gd._fullLayout?.[yKey]
      if (!xa || !ya || typeof xa.p2l !== "function" || typeof ya.p2l !== "function") return null
      return {xa, ya}
    }

    const bounds = (axis, given) => {
      if (Array.isArray(given)) return [Math.min(given[0], given[1]), Math.max(given[0], given[1])]
      return visibleRange(axis)
    }

    // Where a proposed position for point `index` actually lands.
    const settle = (index, proposed) => {
      const found = axes()
      let next = proposed
      if (found) {
        const [x0, x1] = bounds(found.xa, opts.xBounds)
        const [y0, y1] = bounds(found.ya, opts.yBounds)
        next = {x: clamp(proposed.x, x0, x1), y: clamp(proposed.y, y0, y1)}
      }
      if (typeof opts.constrain === "function") next = copyPoint(opts.constrain(next, index, points.map(copyPoint)))
      return next
    }

    const describe = (index) => {
      const handle = handles[index]
      handle.setAttribute("aria-valuetext", format(copyPoint(points[index]), index))
    }

    // Puts every handle (and the jump pad) where the chart now draws it.
    const place = () => {
      const found = axes()
      if (!found) return
      const {xa, ya} = found
      if (pad) {
        pad.style.left = `${xa._offset}px`
        pad.style.top = `${ya._offset}px`
        pad.style.width = `${xa._length}px`
        pad.style.height = `${ya._length}px`
      }
      for (let i = 0; i < handles.length; i++) {
        const px = toPixel(xa, points[i].x)
        const py = toPixel(ya, points[i].y)
        // Zoomed or panned off the plot area: hide rather than float over
        // the axis labels.
        const inside = px >= -0.5 && px <= xa._length + 0.5 && py >= -0.5 && py <= ya._length + 0.5
        handles[i].hidden = !inside
        handles[i].style.transform = `translate(${xa._offset + px}px, ${ya._offset + py}px)`
      }
    }

    const notify = (type) => gd.dispatchEvent(new Event(type, {bubbles: true}))

    // Returns whether the point moved, so a gesture knows to end in a
    // "change".
    const moveTo = (index, proposed) => {
      const next = settle(index, proposed)
      if (next.x === points[index].x && next.y === points[index].y) return false
      points[index] = next
      describe(index)
      place()
      notify("input")
      return true
    }

    // The data point under a client-space pointer position.
    const pointerToData = (clientX, clientY) => {
      const found = axes()
      if (!found) return null
      const rect = gd.getBoundingClientRect()
      return {
        x: toData(found.xa, clientX - rect.left - found.xa._offset),
        y: toData(found.ya, clientY - rect.top - found.ya._offset)
      }
    }

    const handleCenter = (index) => {
      const {xa, ya} = axes()
      const rect = gd.getBoundingClientRect()
      return {
        x: rect.left + xa._offset + toPixel(xa, points[index].x),
        y: rect.top + ya._offset + toPixel(ya, points[index].y)
      }
    }

    // Drags point `index` with the pointer captured on `target`; `grab` is
    // where on the handle the pointer took hold, so the point doesn't jump
    // its center onto the pointer.
    //
    // The drag ends on the release, and also whenever the browser says it is
    // over some other way: the capture is lost (the target left the DOM, or
    // the browser dropped it), or a move arrives with no button held because
    // the release went somewhere this never heard. Ending only on `pointerup`
    // left the move listener armed after a missed release, and since every
    // move puts the point back under the pointer, the point then kept
    // following a mouse with no button down, anywhere over its target -- the
    // whole plot area, with `jump`.
    //
    // `changed` says the press itself already edited the points (a jump, an
    // add); either way the drag's release fires one "change" if anything
    // changed, and none for a press that moved nothing.
    const startDrag = (target, event, index, grab, changed = false) => {
      if (target.setPointerCapture) target.setPointerCapture(event.pointerId)
      const handle = handles[index]
      handle.classList.add("vm-drag-active")
      const drag = new AbortController()
      let edited = changed
      const finish = () => {
        handle.classList.remove("vm-drag-active")
        drag.abort()
        if (edited) notify("change")
      }
      const move = (moveEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return
        // `buttons` is 0 once the primary button is up; a touch or pen
        // reports 1 while in contact. Undefined (no support) means held.
        if (moveEvent.buttons === 0) {
          finish()
          return
        }
        const proposed = pointerToData(moveEvent.clientX - grab.x, moveEvent.clientY - grab.y)
        if (proposed && moveTo(index, proposed)) edited = true
      }
      const end = (endEvent) => {
        if (endEvent.pointerId !== event.pointerId) return
        finish()
      }
      target.addEventListener("pointermove", move, {signal: drag.signal})
      target.addEventListener("pointerup", end, {signal: drag.signal})
      target.addEventListener("pointercancel", end, {signal: drag.signal})
      target.addEventListener("lostpointercapture", end, {signal: drag.signal})
    }

    // Hands the keyboard to a point the reader just moved with the pointer,
    // without the focus ring meant for keyboard users.
    const focusQuietly = (handle) => handle.focus({preventScroll: true, focusVisible: false})

    const nearest = (clientX, clientY) => {
      let best = -1
      let bestDistance = Infinity
      for (let i = 0; i < points.length; i++) {
        const center = handleCenter(i)
        const distance = Math.hypot(center.x - clientX, center.y - clientY)
        if (distance < bestDistance) {
          best = i
          bestDistance = distance
        }
      }
      return best
    }

    // One arrow-key step, in data units, signed so that ArrowRight and
    // ArrowUp move the point right and up on screen even on a reversed axis.
    const keyStep = () => {
      const found = axes()
      if (!found) return {x: opts.step?.x ?? 0, y: opts.step?.y ?? 0}
      const [x0, x1] = bounds(found.xa, opts.xBounds)
      const [y0, y1] = bounds(found.ya, opts.yBounds)
      const sx = found.xa.range[0] > found.xa.range[1] ? -1 : 1
      const sy = found.ya.range[0] > found.ya.range[1] ? -1 : 1
      return {x: sx * (opts.step?.x ?? (x1 - x0) / 100), y: sy * (opts.step?.y ?? (y1 - y0) / 100)}
    }

    // Removes point `index`. From the keyboard the focus moves on to the
    // point that took its place (or the new last one), so Delete pressed
    // again keeps removing; from a double-click it is left alone.
    const removeAt = (index, keyboard) => {
      if (points.length <= minPoints) return
      points.splice(index, 1)
      names?.splice(index, 1)
      colors?.splice(index, 1)
      build()
      if (keyboard && handles.length > 0) handles[Math.min(index, handles.length - 1)].focus()
      notify("input")
      notify("change")
    }

    // Adds a point where the pointer is and returns its index, or -1 at
    // `maxPoints` (or before the chart has axes).
    const addAt = (event) => {
      if (points.length >= maxPoints) return -1
      const proposed = pointerToData(event.clientX, event.clientY)
      if (!proposed) return -1
      const index = points.length
      const next = settle(index, proposed)
      points.push(next)
      build()
      notify("input")
      return index
    }

    const build = () => {
      for (const handle of handles) handle.remove()
      handles = []
      for (let i = 0; i < points.length; i++) {
        const handle = document.createElement("div")
        handle.className = "vm-drag-point"
        handle.tabIndex = 0
        handle.setAttribute("role", "slider")
        let name = names?.[i]
        if (name === undefined) {
          name = names ? "Point" : opts.label ?? "Point"
          if (!single) name = `${name} ${i + 1}`
        }
        handle.setAttribute("aria-label", name)
        handle.style.color = (colors ? colors[i] : opts.color) ?? "var(--vm-color-fn)"
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== undefined && event.button !== 0) return
          // Not cancelled: the browser's own press-focus is what gives the
          // keyboard the point without a focus ring, which a script focus()
          // after a cancelled press would draw. The point's CSS stops a text
          // selection, and it sits above Plotly's drag layer, so the press
          // never reaches that.
          const center = handleCenter(i)
          startDrag(handle, event, i, {x: event.clientX - center.x, y: event.clientY - center.y})
        }, {signal})
        handle.addEventListener("keydown", (event) => {
          const step = keyStep()
          const times = event.shiftKey ? 10 : 1
          let dx = 0
          let dy = 0
          if (event.key === "ArrowLeft") dx = -1
          else if (event.key === "ArrowRight") dx = 1
          else if (event.key === "ArrowUp") dy = 1
          else if (event.key === "ArrowDown") dy = -1
          else if (opts.remove && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault()
            removeAt(i, true)
            return
          } else return
          event.preventDefault()
          if (moveTo(i, {x: points[i].x + dx * step.x * times, y: points[i].y + dy * step.y * times})) notify("change")
        }, {signal})
        if (opts.remove) {
          handle.addEventListener("dblclick", (event) => {
            event.preventDefault()
            removeAt(i, false)
          }, {signal})
        }
        layer.append(handle)
        handles.push(handle)
        describe(i)
      }
      place()
    }

    if (opts.jump || opts.add) {
      pad = document.createElement("div")
      pad.className = "vm-drag-pad"
      layer.append(pad)
      // What a press on the pad does: move the nearest point there (jump),
      // or put a new one there (add). Either returns the point's index, or
      // -1 when nothing happened.
      // `pressChanged` says whether it changed anything: a jump onto the
      // point's own position doesn't, and then ends in no "change".
      let pressChanged = false
      const jump = (event) => {
        pressChanged = false
        if (opts.add) {
          const added = addAt(event)
          pressChanged = added >= 0
          return added
        }
        const index = nearest(event.clientX, event.clientY)
        const proposed = pointerToData(event.clientX, event.clientY)
        if (index < 0 || !proposed) return -1
        pressChanged = moveTo(index, proposed)
        return index
      }
      pad.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return
        if (event.pointerType !== "mouse") {
          // A touch or pen: wait for the tap to end. If it turns into a
          // scroll, the browser cancels the pointer and nothing moves.
          const tap = new AbortController()
          pad.addEventListener("pointerup", (up) => {
            if (up.pointerId !== event.pointerId) return
            tap.abort()
            const index = jump(up)
            if (index < 0) return
            focusQuietly(handles[index])
            if (pressChanged) notify("change")
          }, {signal: tap.signal})
          pad.addEventListener("pointercancel", (cancel) => {
            if (cancel.pointerId === event.pointerId) tap.abort()
          }, {signal: tap.signal})
          return
        }
        // Stops the press starting a text selection on the page.
        event.preventDefault()
        const index = jump(event)
        if (index < 0) return
        focusQuietly(handles[index])
        startDrag(pad, event, index, {x: 0, y: 0}, pressChanged)
      }, {signal})
    }

    build()

    // Plotly redraws on a resize, a theme toggle and every relayout; each
    // ends in plotly_afterplot. plotly_relayouting fires during a pan.
    // Through keepListening, so a newPlot on this div (which drops every
    // listener) doesn't leave the handles stranded where they were.
    const onRedraw = () => place()
    const unlisten = globalThis.VM.plotting.keepListening(gd, {
      plotly_afterplot: onRedraw,
      plotly_relayout: onRedraw,
      plotly_relayouting: onRedraw
    })

    const detach = () => {
      listeners.abort()
      unlisten()
      layer.remove()
      gd.classList.remove("vm-drag-host")
      gd.__vmDragPoints = undefined
    }
    gd.__vmDragPoints = {detach}

    Object.defineProperty(gd, "value", {
      configurable: true,
      get() {
        if (single) return copyPoint(points[0])
        return points.map(copyPoint)
      },
      set(next) {
        let list = []
        if (single) list = [copyPoint(next)]
        else list = Array.from(next ?? [], copyPoint)
        const rebuild = list.length !== points.length
        points = list
        if (rebuild) build()
        else {
          for (let i = 0; i < points.length; i++) describe(i)
          place()
        }
      }
    })

    return gd
  }

  Object.assign((globalThis.VM ??= {}).plotting ??= {}, {draggablePoints})
})(window)
