// The input grammar, framework-free: the presenter owns WHAT happens, this module owns
// WHICH gesture means what. Keys, tap/hold/drag, phone tap zones, fullscreen visibility.

export const TAP_SLOP = 24 // a pointer that moved further is a drag (pan, pinch), not a tap

// One key -> one action. Modifier chords stay the browser's. Digits accumulate for
// type-number-Enter jumps (the presenter keeps the buffer). Unknown keys are swallowed:
// presenting owns the keyboard - no stray Excalidraw shortcuts mid-talk.
export function keyAction(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null
  const k = e.key
  if (/^\d$/.test(k)) return { type: 'digit', digit: k }
  if (k === 'Enter') return { type: 'enter' }
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') return { type: 'next' }
  if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') return { type: 'prev' }
  if (k === 'o') return { type: 'overview' }
  if (k === '+' || k === '=') return { type: 'zoomIn' }
  if (k === '-') return { type: 'zoomOut' }
  if (k === 'Escape') return { type: 'reframe' }
  if (k === 'e') return { type: 'edit' }
  if (k === 'f') return { type: 'fullscreen' }
  return { type: 'swallow' }
}

// A remote mouse from stage, or a thumb on a phone. Zones (when on) are computed from the
// live viewport width, so orientation doesn't matter: the left 35% means back on release,
// the right 35% means next on release, the middle 30% keeps the full grammar - tap next,
// hold holdMs back (fires at the threshold; release adds nothing). Right-click is always
// back: remote-mouse apps send a two-finger tap as one, and it works even when the hardware
// emits press+release as an instant pair. A drag past TAP_SLOP is a pan or pinch: cancelled.
export function createTapGrammar({ holdMs, tapZones, viewportWidth, inert, onNext, onPrev }) {
  const tap = { down: null, timer: 0, held: false }
  const zone = (x) => {
    if (!tapZones) return 'middle'
    const w = viewportWidth()
    return x < w * 0.35 ? 'prev' : x > w * 0.65 ? 'next' : 'middle'
  }
  return {
    pointerDown(e) {
      clearTimeout(tap.timer)
      tap.timer = 0
      tap.held = false
      tap.down = inert() || e.button !== 0 ? null : { x: e.clientX, y: e.clientY, zone: zone(e.clientX) }
      if (!tap.down || tap.down.zone !== 'middle') return // zones act on release; only the middle holds
      tap.timer = setTimeout(() => {
        tap.timer = 0
        tap.held = true
        onPrev()
      }, holdMs)
    },
    pointerMove(e) {
      if (!tap.down || Math.hypot(e.clientX - tap.down.x, e.clientY - tap.down.y) <= TAP_SLOP) return
      clearTimeout(tap.timer)
      tap.timer = 0
      tap.down = null
    },
    pointerUp() {
      clearTimeout(tap.timer)
      tap.timer = 0
      if (!tap.down || tap.held) return
      const z = tap.down.zone
      tap.down = null
      if (z === 'prev') onPrev()
      else onNext()
    },
    contextMenu() {
      onPrev()
    },
    cancel() {
      clearTimeout(tap.timer)
      tap.timer = 0
      tap.down = null
    },
  }
}

// auto: phones and tablets get the button, laptops stay chrome-free.
export function fullscreenButtonVisible(setting, coarsePointer) {
  if (setting === true) return true
  if (setting === false) return false
  if (setting === 'auto') return coarsePointer
  throw new Error(`deck: fullscreenButton must be auto, true or false, got ${JSON.stringify(setting)}`)
}
