export const TAP_SLOP = 24 // a pointer that moved further is a drag (pan, pinch), not a tap

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

// In edit mode the presenting grammar is off and keys belong to Excalidraw; `e` is the one
// exception so edit toggles both ways. It must not fire while typing in a text element —
// Excalidraw's text editor is a textarea. Shadows Excalidraw's eraser shortcut.
export function exitsEdit(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return false
  if (e.key !== 'e') return false
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return false
  return true
}

// Right-click means back because remote-mouse apps send a two-finger tap as one right-click,
// sometimes with press+release as an instant pair — too fast for the hold timer.
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

export function fullscreenButtonVisible(setting, coarsePointer) {
  if (setting === true) return true
  if (setting === false) return false
  if (setting === 'auto') return coarsePointer
  throw new Error(`deck: fullscreenButton must be auto, true or false, got ${JSON.stringify(setting)}`)
}
