// Presenter: one canvas, the camera flies frame to frame.
//   → space PageDown ↓   next step / slide      (clickers send PageDown/PageUp)
//   ← PageUp ↑           back
//   tap                  next · hold back · right-click back   (a remote mouse from stage)
//   tap zones (phones)   left 35% back · right 35% next · middle keeps tap/hold
//   o                    overview (whole talk); click a frame to jump there
//   3 Enter              jump to slide 3 (0-based, the number in the URL hash)
//   + / −                zoom in / out; pinch and drag work too
//   Escape               back to the current slide, framed
//   e                    edit: Excalidraw UI on, draw live; e again (or "present") returns
//   f                    fullscreen
// Position lives in the URL hash (#slide.step) so a reload lands where you were.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  convertToExcalidrawElements,
  newElementWith,
  viewportCoordsToSceneCoords,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { createBuild, flattenTakes } from './build.js'
import { createTapGrammar, exitsEdit, fullscreenButtonVisible, keyAction } from './behaviors.js'

const { build } = createBuild({
  convert: (skeletons) => convertToExcalidrawElements(skeletons, { regenerateIds: false }),
  fontFamily: FONT_FAMILY,
})

// Excalidraw's font ids are fixed, so a theme re-points a role's family at a local face:
// a face added after Excalidraw registers its own wins the codepoints.
const ROLE_FAMILY = { draw: 'Liberation Sans', display: 'Virgil', sans: 'Nunito', mono: 'Cascadia', hand: 'Excalifont' }
const FONT_NAMES = Object.values(ROLE_FAMILY)
const FLY_MS = 900
const FADE_MS = 350
const ZOOM_STEP = 1.25

export function mount(rootEl, takes, config) {
  const slides = flattenTakes(takes)
  const swaps = Object.entries(config.theme.fonts).map(([role, file]) => [ROLE_FAMILY[role], file])

  // Excalidraw registers its font faces after mounting. Wait for them, add the theme's faces
  // on top, then load the faces covering every character in the deck.
  function fontsLoaded() {
    const text = [...new Set(slides.flatMap((s) => s.items.map((i) => i.text ?? i.label ?? '')).join(''))].join('')
    const started = performance.now()
    return new Promise((resolve, reject) => {
      const wait = () => {
        const registered = new Set([...document.fonts].map((f) => f.family.replace(/"/g, '')))
        if (FONT_NAMES.every((f) => registered.has(f)))
          return resolve(
            Promise.all(swaps.map(([family, file]) => new FontFace(family, `url(${new URL(file, document.baseURI).href})`).load()))
              .then((faces) => faces.forEach((f) => document.fonts.add(f)))
              .then(() => Promise.all(FONT_NAMES.map((f) => document.fonts.load(`32px "${f}"`, text))))
          )
        if (performance.now() - started > 5000) return reject(new Error(`deck: fonts never registered: ${FONT_NAMES.filter((f) => !registered.has(f))}`))
        requestAnimationFrame(wait)
      }
      wait()
    })
  }

  // Text is measured at build time, so the scene is built once fonts load. Until then, the
  // index from a first build serves navigation; it is replaced with the loaded scene's.
  let { index, labels, fades } = build(slides, takes, config.theme)
  let builtIds = new Set()

  function readHash() {
    const m = location.hash.match(/^#(\d+)\.(\d+)$/)
    if (!m) return { slide: 0, step: 0 }
    const slide = Math.min(Number(m[1]), index.length - 1)
    return { slide, step: Math.min(Number(m[2]), index[slide].steps.length - 1) }
  }

  // Every slide before the current one is complete; the current one shows up to `step`.
  const shownUpTo = (pos, i) => (i < pos.slide ? Infinity : i === pos.slide ? pos.step : 0)

  function opacities(pos) {
    const out = new Map()
    index.forEach((s, i) => s.steps.forEach((ids, k) => ids.forEach((id) => out.set(id, k <= shownUpTo(pos, i) ? fades.get(id) : 0))))
    return out
  }

  // Writes never enter undo history; elements drawn live in edit mode pass through untouched.
  function setOpacity(api, values) {
    const next = api.getSceneElementsIncludingDeleted().map((el) => (values.has(el.id) && el.opacity !== values.get(el.id) ? newElementWith(el, { opacity: values.get(el.id) }) : el))
    api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.NEVER })
  }

  let fading = 0
  function reveal(api, pos, animate) {
    const target = opacities(pos)
    const from = new Map()
    for (const el of api.getSceneElements()) if (target.has(el.id) && el.opacity !== target.get(el.id)) from.set(el.id, el.opacity)
    const run = ++fading
    if (!animate) return setOpacity(api, target)
    const t0 = performance.now()
    const tick = () => {
      if (run !== fading) return // a newer reveal took over
      const t = Math.min(1, (performance.now() - t0) / FADE_MS)
      setOpacity(api, new Map([...from].map(([id, a]) => [id, Math.round(a + (target.get(id) - a) * t)])))
      if (t < 1) requestAnimationFrame(tick)
    }
    tick()
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  // The window background fades to the target slide's plate (or back to the theme) in step
  // with the camera. Non-#rrggbb colors can't interpolate and switch instantly.
  const channels = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : null)
  let tinting = 0
  function fadeBackground(api, to, animate) {
    const from = api.getAppState().viewBackgroundColor
    const set = (color) => api.updateScene({ appState: { viewBackgroundColor: color }, captureUpdate: CaptureUpdateAction.NEVER })
    const run = ++tinting
    const [a, b] = [channels(from), channels(to)]
    if (!animate || from === to || !a || !b) return set(to)
    const t0 = performance.now()
    const tick = () => {
      if (run !== tinting) return // a newer tint took over
      const t = Math.min(1, (performance.now() - t0) / FLY_MS)
      const k = ease(t)
      set('#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''))
      if (t < 1) requestAnimationFrame(tick)
    }
    tick()
  }

  let flying = 0
  let legs = 0 // each fly() is a leg; a newer one cancels the pending parts of the old

  function moveCamera(api, b, { factor = 1, animate }) {
    const s = api.getAppState()
    const z1 = Math.min(s.width / b.w, s.height / b.h) * factor
    const c1 = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    const z0 = s.zoom.value
    const c0 = { x: s.width / 2 / z0 - s.scrollX, y: s.height / 2 / z0 - s.scrollY }
    const set = (z, c) =>
      api.updateScene({ appState: { zoom: { value: z }, scrollX: s.width / 2 / z - c.x, scrollY: s.height / 2 / z - c.y }, captureUpdate: CaptureUpdateAction.NEVER })
    const run = ++flying
    if (!animate) return set(z1, c1)
    const t0 = performance.now()
    const tick = () => {
      if (run !== flying) return // a newer move took over
      const t = Math.min(1, (performance.now() - t0) / FLY_MS)
      const k = ease(t)
      set(Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * k), { x: c0.x + (c1.x - c0.x) * k, y: c0.y + (c1.y - c0.y) * k })
      if (t < 1) requestAnimationFrame(tick)
    }
    tick()
  }

  function talkBounds(take) {
    const xs = take === undefined ? [...index.map((s) => s.bounds), ...labels] : index.filter((s) => s.take === take).map((s) => s.bounds)
    const x = Math.min(...xs.map((b) => b.x))
    const y = Math.min(...xs.map((b) => b.y))
    return { x, y, w: Math.max(...xs.map((b) => b.x + b.w)) - x, h: Math.max(...xs.map((b) => b.y + b.h)) - y }
  }

  function frameAt(point) {
    const i = index.findIndex(({ bounds: b }) => point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h)
    return i === -1 ? null : i
  }

  function Media({ camera, pos }) {
    return index.flatMap((s, i) =>
      s.media.map((m) => {
        const style = {
          position: 'absolute',
          left: (m.x + camera.scrollX) * camera.zoom,
          top: (m.y + camera.scrollY) * camera.zoom,
          width: m.w * camera.zoom,
          height: m.h * camera.zoom,
          opacity: m.step <= shownUpTo(pos, i) ? 1 : 0,
          transition: `opacity ${FADE_MS}ms`,
          pointerEvents: 'none',
          objectFit: 'contain',
        }
        return m.kind === 'video' ? (
          <video key={m.id} id={m.id} src={m.src} muted playsInline preload="auto" style={style} />
        ) : (
          <img key={m.id} id={m.id} src={m.src} alt="" style={style} />
        )
      })
    )
  }

  function cue(slide) {
    index.forEach((s, i) =>
      s.media.forEach((m) => {
        if (m.kind !== 'video') return
        const el = document.getElementById(m.id)
        el.pause()
        if (i !== slide) return
        el.currentTime = 0
        el.play().catch((e) => console.error(`deck: video ${m.src} did not play (autoplay policy?)`, e))
      })
    )
  }

  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
  const showFullscreen = fullscreenButtonVisible(config.behaviors.fullscreenButton, window.matchMedia('(pointer: coarse)').matches)

  function App() {
    const [api, setApi] = useState(null)
    const posRef = useRef(readHash())
    const [pos, setPos] = useState(posRef.current)
    const overviewRef = useRef(false)
    const typedRef = useRef('')
    const [editing, setEditing] = useState(false)
    const [camera, setCamera] = useState({ scrollX: 0, scrollY: 0, zoom: 1 })
    const [ready, setReady] = useState(false)
    const [error, setError] = useState(null)
    // The media overlay follows the camera. onScrollChange misses programmatic moves; onChange sees them all.
    const onChange = useCallback((_, { scrollX, scrollY, zoom }) => {
      setCamera((c) => (c.scrollX === scrollX && c.scrollY === scrollY && c.zoom === zoom.value ? c : { scrollX, scrollY, zoom: zoom.value }))
    }, [])

    const fly = useCallback(
      (slide, animate, land, arriving = false) => {
        const target = index[slide]
        // A slide with a plate owns the whole window, not just its frame (frames clip
        // their contents, so a plate alone can never paint past the 1920×1080 edge).
        fadeBackground(api, target.plate ?? config.theme.background, animate)
        const leg = ++legs
        const go = () => leg === legs && moveCamera(api, target.bounds, { animate })
        const viaOverview = animate && arriving && target.via === 'overview'
        overviewRef.current = false
        if (viaOverview) {
          moveCamera(api, talkBounds(target.take), { factor: 0.95, animate })
          setTimeout(go, FLY_MS + 400)
        } else go()
        if (land) setTimeout(() => leg === legs && land(), !animate ? 0 : viaOverview ? 2 * FLY_MS + 400 : FLY_MS)
      },
      [api]
    )

    const goto = useCallback(
      (next) => {
        const prev = posRef.current
        posRef.current = next
        setPos(next)
        history.replaceState(null, '', `#${next.slide}.${next.step}`)
        reveal(api, next, next.slide === prev.slide)
        // A step re-frames too: after a zoom or pan, the next press brings the slide back.
        const arriving = next.slide !== prev.slide
        fly(next.slide, true, arriving ? () => cue(next.slide) : null, arriving)
      },
      [api, fly]
    )

    const next = useCallback(() => {
      const { slide, step } = posRef.current
      if (step < index[slide].steps.length - 1) goto({ slide, step: step + 1 })
      else if (slide < index.length - 1) goto({ slide: slide + 1, step: 0 })
    }, [goto])

    const prev = useCallback(() => {
      const { slide, step } = posRef.current
      if (step > 0) goto({ slide, step: step - 1 })
      else if (slide > 0) goto({ slide: slide - 1, step: index[slide - 1].steps.length - 1 })
    }, [goto])

    const overview = useCallback(() => {
      overviewRef.current = !overviewRef.current
      if (overviewRef.current) {
        legs++
        fadeBackground(api, config.theme.background, true)
        moveCamera(api, talkBounds(), { factor: 0.95, animate: true })
      } else fly(posRef.current.slide, true)
    }, [api, fly])

    const zoomBy = useCallback(
      (factor) => {
        flying++ // a zoom cancels any camera move in flight
        legs++
        const s = api.getAppState()
        const z = s.zoom.value
        const z2 = Math.min(30, Math.max(0.1, z * factor))
        const cx = s.width / 2
        const cy = s.height / 2
        api.updateScene({
          appState: { zoom: { value: z2 }, scrollX: cx / z2 - (cx / z - s.scrollX), scrollY: cy / z2 - (cy / z - s.scrollY) },
          captureUpdate: CaptureUpdateAction.NEVER,
        })
      },
      [api]
    )

    const present = useCallback(
      (on) => {
        setEditing(!on)
        if (!on) return
        const s = api.getAppState()
        const center = viewportCoordsToSceneCoords({ clientX: s.offsetLeft + s.width / 2, clientY: s.offsetTop + s.height / 2 }, s)
        const here = frameAt(center)
        if (here !== null && here !== posRef.current.slide) goto({ slide: here, step: 0 })
        else fly(posRef.current.slide, true)
      },
      [api, goto, fly]
    )

    useEffect(() => {
      if (!api) return
      fontsLoaded()
        .then((loaded) => {
          FONT_NAMES.forEach((f, i) => {
            if (!loaded[i].length) throw new Error(`deck: font "${f}" did not load`)
          })
          const built = build(slides, takes, config.theme)
          index = built.index
          labels = built.labels
          fades = built.fades
          builtIds = new Set(built.elements.map((el) => el.id))
          api.updateScene({ elements: built.elements, captureUpdate: CaptureUpdateAction.NEVER })
          reveal(api, posRef.current, false)
          requestAnimationFrame(() => fly(posRef.current.slide, false, () => cue(posRef.current.slide)))
          setReady(true)
        })
        .catch((e) => setError(e.message ?? String(e)))
    }, [api]) // eslint-disable-line react-hooks/exhaustive-deps -- once, when the canvas is ready

    useEffect(() => {
      if (!ready) return
      const warn = (e) => {
        if (api.getSceneElements().some((el) => !builtIds.has(el.id))) e.preventDefault()
      }
      window.addEventListener('beforeunload', warn)
      return () => window.removeEventListener('beforeunload', warn)
    }, [api, ready])

    useEffect(() => {
      if (!ready) return
      api.updateScene({
        appState: { frameRendering: { enabled: true, clip: true, name: editing, outline: editing } },
        captureUpdate: CaptureUpdateAction.NEVER,
      })
    }, [api, ready, editing])

    useEffect(() => {
      if (!ready || !editing) return
      const onKey = (e) => {
        if (!exitsEdit(e)) return
        e.preventDefault()
        e.stopPropagation()
        present(true)
      }
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    }, [ready, editing, present])

    useEffect(() => {
      if (!ready || editing) return
      const onKey = (e) => {
        const action = keyAction(e)
        if (!action) return
        if (action.type === 'digit') typedRef.current += action.digit
        else if (action.type === 'enter' && typedRef.current) {
          const slide = Number(typedRef.current)
          typedRef.current = ''
          if (index[slide]) goto({ slide, step: 0 })
        } else if (action.type === 'next') next()
        else if (action.type === 'prev') prev()
        else if (action.type === 'overview') overview()
        else if (action.type === 'zoomIn') zoomBy(ZOOM_STEP)
        else if (action.type === 'zoomOut') zoomBy(1 / ZOOM_STEP)
        else if (action.type === 'reframe') fly(posRef.current.slide, true)
        else if (action.type === 'edit') present(false)
        else if (action.type === 'fullscreen') toggleFullscreen()
        if (action.type !== 'digit' && action.type !== 'enter') typedRef.current = ''
        e.preventDefault()
        e.stopPropagation()
      }
      const onPointer = (e) => {
        if (!overviewRef.current) return
        const slide = frameAt(viewportCoordsToSceneCoords(e, api.getAppState()))
        if (slide === null) return
        e.stopPropagation()
        goto({ slide, step: 0 })
      }
      const grammar = createTapGrammar({
        holdMs: config.behaviors.holdMs,
        tapZones: config.behaviors.tapZones,
        viewportWidth: () => window.innerWidth,
        inert: () => overviewRef.current,
        onNext: next,
        onPrev: prev,
      })
      const onContext = (e) => {
        e.preventDefault()
        e.stopPropagation()
        grammar.contextMenu()
      }
      const onResize = () => fly(posRef.current.slide, false)
      // goto writes the hash with replaceState, which never fires hashchange — no loop.
      const onHash = () => goto(readHash())
      window.addEventListener('hashchange', onHash)
      window.addEventListener('keydown', onKey, true)
      window.addEventListener('pointerdown', onPointer, true)
      window.addEventListener('pointerdown', grammar.pointerDown, true)
      window.addEventListener('pointermove', grammar.pointerMove, true)
      window.addEventListener('pointerup', grammar.pointerUp, true)
      window.addEventListener('contextmenu', onContext, true)
      window.addEventListener('resize', onResize)
      return () => {
        grammar.cancel()
        window.removeEventListener('hashchange', onHash)
        window.removeEventListener('keydown', onKey, true)
        window.removeEventListener('pointerdown', onPointer, true)
        window.removeEventListener('pointerdown', grammar.pointerDown, true)
        window.removeEventListener('pointermove', grammar.pointerMove, true)
        window.removeEventListener('pointerup', grammar.pointerUp, true)
        window.removeEventListener('contextmenu', onContext, true)
        window.removeEventListener('resize', onResize)
      }
    }, [api, ready, editing, next, prev, overview, zoomBy, present, goto, fly])

    return (
      <div className={editing ? 'deck' : 'deck presenting'}>
        <Excalidraw
          excalidrawAPI={setApi}
          initialData={{ appState: { viewBackgroundColor: config.theme.background } }}
          viewModeEnabled={!editing}
          zenModeEnabled={!editing}
          onChange={onChange}
        />
        <div className="media">
          <Media camera={camera} pos={pos} />
        </div>
        {error && <div className="error">{error}</div>}
        {!editing && showFullscreen && (
          <button className="fullscreen" aria-label="fullscreen" onClick={toggleFullscreen}>
            ⛶
          </button>
        )}
        {editing && (
          <button className="present" onClick={() => present(true)}>
            present
          </button>
        )}
      </div>
    )
  }

  createRoot(rootEl).render(<App />)
}
