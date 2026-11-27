export const FRAME = { w: 1920, h: 1080, gap: 480, perRow: 99, takeGap: 1400 }

export const STOCK_COLORS = {
  black: { stroke: '#1e1e1e', fill: '#e9ecef' },
  grey: { stroke: '#868e96', fill: '#e9ecef' },
  red: { stroke: '#e03131', fill: '#ffc9c9' },
  'light-red': { stroke: '#ff8787', fill: '#ffc9c9' },
  orange: { stroke: '#f08c00', fill: '#ffd8a8' },
  yellow: { stroke: '#f08c00', fill: '#ffec99' },
  green: { stroke: '#2f9e44', fill: '#b2f2bb' },
  'light-green': { stroke: '#40c057', fill: '#b2f2bb' },
  blue: { stroke: '#1971c2', fill: '#a5d8ff' },
  'light-blue': { stroke: '#4dabf7', fill: '#d0ebff' },
  violet: { stroke: '#9c36b5', fill: '#eebefa' },
  'light-violet': { stroke: '#cc5de8', fill: '#f3d9fa' },
}

export const GEOS = { rectangle: 'rectangle', ellipse: 'ellipse', diamond: 'diamond' }
export const FILLS = { none: null, semi: 'solid', pattern: 'hachure' }
export const DASHES = { draw: 'solid', dashed: 'dashed', dotted: 'dotted' }
export const ALIGNS = { start: 'left', middle: 'center', end: 'right' }
export const VALIGNS = { start: 'top', middle: 'middle', end: 'bottom' }
export const HEADS = { none: null, arrow: 'arrow' }
const INK = '#1e1e1e'

// Mirrored by schemas/slides.schema.json and deck.d.ts; tests pin the three together.
export const ITEM_KEYS = {
  text:  ['t', 'x', 'y', 'fs', 'text', 'font', 'color', 'align', 'angle', 'w', 'step', 'fade'],
  box:   ['t', 'x', 'y', 'w', 'h', 'text', 'fs', 'geo', 'color', 'fill', 'dash', 'font', 'align', 'valign', 'ink', 'step', 'fade'],
  note:  ['t', 'x', 'y', 'size', 'text', 'fs', 'color', 'font', 'ink', 'step', 'fade'],
  plate: ['t', 'color', 'step', 'fade'],
  arrow: ['t', 'from', 'to', 'color', 'sw', 'dash', 'text', 'fs', 'font', 'ink', 'start', 'end', 'step', 'fade'],
  line:  ['t', 'from', 'to', 'color', 'sw', 'dash', 'text', 'fs', 'font', 'ink', 'step', 'fade'],
  slot:  ['t', 'x', 'y', 'w', 'h', 'label', 'geo', 'fill', 'align', 'valign', 'ink', 'step', 'fade'],
  video: ['t', 'x', 'y', 'w', 'h', 'src', 'step'],
  image: ['t', 'x', 'y', 'w', 'h', 'src', 'step'],
}

export const ITEM_REQUIRED = {
  text: ['x', 'y', 'fs', 'text'],
  box: ['x', 'y', 'w', 'h', 'text'],
  note: ['x', 'y', 'size', 'text', 'fs'],
  plate: [],
  arrow: ['from', 'to'],
  line: ['from', 'to'],
  slot: ['x', 'y', 'w', 'h', 'label'],
  video: ['x', 'y', 'w', 'h', 'src'],
  image: ['x', 'y', 'w', 'h', 'src'],
}

export function flattenTakes(takes) {
  return takes.flatMap((t, take) => t.slides.map((s) => ({ ...s, take })))
}

function need(item, key) {
  if (item[key] === undefined) throw new Error(`deck: ${item.t} item is missing "${key}"`)
  return item[key]
}

function pick(table, key, what) {
  if (!(key in table)) throw new Error(`deck: unknown ${what} "${key}"`)
  return table[key]
}

function takeOrigins(slides) {
  const origins = []
  let y = 0
  for (let take = 0; slides.some((s) => s.take === take); take++) {
    origins.push(y)
    const lastCol = Math.max(...slides.filter((s) => s.take === take).map((s) => s.col))
    y += (Math.floor(lastCol / FRAME.perRow) + 1) * (FRAME.h + FRAME.gap) + FRAME.takeGap
  }
  return origins
}

function frameBounds(slide, origins) {
  const row = slide.col < 0 ? 0 : Math.floor(slide.col / FRAME.perRow)
  const col = slide.col < 0 ? slide.col : slide.col % FRAME.perRow
  return { x: col * (FRAME.w + FRAME.gap), y: origins[need(slide, 'take')] + row * (FRAME.h + FRAME.gap), w: FRAME.w, h: FRAME.h }
}

// convert and fontFamily are injected: @excalidraw/excalidraw cannot load in plain Node,
// so tests pass the stub from stub-convert.js.
export function createBuild({ convert, fontFamily }) {
  const FONTS = {
    draw: fontFamily['Liberation Sans'],
    display: fontFamily.Virgil,
    sans: fontFamily.Nunito,
    mono: fontFamily.Cascadia,
    hand: fontFamily.Excalifont,
  }

  // Returns { elements, index, labels, fades }: index[i] = { frameId, steps: [[ids]…], media,
  // bounds, via, take }; labels are the take names' rects; fades.get(id) is the opacity an
  // element reveals to (an item's `fade`, usually 100). Item coordinates are frame-relative;
  // elements land in scene coordinates.
  function build(slides, takes, theme) {
    const COLORS = { ...STOCK_COLORS, ...theme.colors }
    const color = (item) => pick(COLORS, item.color ?? 'black', 'color')
    const font = (item) => pick(FONTS, item.font ?? 'draw', 'font')
    const dash = (item) => pick(DASHES, item.dash ?? 'draw', 'dash')
    const ink = (item) => (item.ink ? pick(COLORS, item.ink, 'color').stroke : INK)

    const builders = {
      text(item) {
        return {
          type: 'text',
          x: item.x,
          y: item.y,
          text: need(item, 'text'),
          fontSize: need(item, 'fs'),
          fontFamily: font(item),
          strokeColor: color(item).stroke,
          textAlign: pick(ALIGNS, item.align ?? 'start', 'align'),
          ...(item.angle !== undefined && { angle: (item.angle * Math.PI) / 180 }),
        }
      },

      box(item) {
        const c = color(item)
        const fill = pick(FILLS, item.fill ?? 'none', 'fill')
        const text = need(item, 'text')
        return {
          type: pick(GEOS, item.geo ?? 'rectangle', 'geo'),
          x: item.x,
          y: item.y,
          width: need(item, 'w'),
          height: need(item, 'h'),
          strokeColor: c.stroke,
          backgroundColor: fill ? c.fill : 'transparent',
          fillStyle: fill ?? 'solid',
          strokeWidth: 4,
          strokeStyle: dash(item),
          roundness: { type: 3 },
          ...(text && {
            label: {
              text,
              fontSize: item.fs ?? 32,
              fontFamily: font(item),
              strokeColor: ink(item),
              textAlign: pick(ALIGNS, item.align ?? 'middle', 'align'),
              verticalAlign: pick(VALIGNS, item.valign ?? 'middle', 'valign'),
            },
          }),
        }
      },

      note(item) {
        const size = need(item, 'size')
        return {
          type: 'rectangle',
          x: item.x,
          y: item.y,
          width: size,
          height: size,
          strokeColor: 'transparent',
          backgroundColor: pick(COLORS, item.color ?? 'yellow', 'color').fill,
          fillStyle: 'solid',
          roughness: 0,
          label: { text: need(item, 'text'), fontSize: need(item, 'fs'), fontFamily: font(item), strokeColor: ink(item) },
        }
      },

      plate(item) {
        return {
          type: 'rectangle',
          x: 0,
          y: 0,
          width: FRAME.w,
          height: FRAME.h,
          strokeColor: 'transparent',
          backgroundColor: color(item).fill,
          fillStyle: 'solid',
          roughness: 0,
          roundness: null,
        }
      },

      arrow(item) {
        const [x1, y1] = need(item, 'from')
        const [x2, y2] = need(item, 'to')
        return {
          type: 'arrow',
          x: x1,
          y: y1,
          points: [
            [0, 0],
            [x2 - x1, y2 - y1],
          ],
          strokeColor: color(item).stroke,
          strokeWidth: item.sw ?? 4,
          strokeStyle: dash(item),
          startArrowhead: pick(HEADS, item.start ?? 'none', 'arrowhead'),
          endArrowhead: pick(HEADS, item.end ?? 'arrow', 'arrowhead'),
          ...(item.text && { label: { text: item.text, fontSize: item.fs ?? 32, fontFamily: font(item), strokeColor: ink(item) } }),
        }
      },

      line(item) {
        return builders.arrow({ ...item, start: 'none', end: 'none' })
      },

      slot(item) {
        return builders.box({ ...item, text: need(item, 'label'), fs: 32, color: 'grey', dash: 'dashed', font: 'mono' })
      },
    }

    const origins = takeOrigins(slides)
    const skeletons = takes.map((t, k) => ({
      type: 'text',
      id: `take-${k}`,
      x: 0,
      y: origins[k] - 640,
      text: t.name,
      fontSize: 360,
      fontFamily: FONTS.display,
      strokeColor: STOCK_COLORS.grey.stroke,
    }))
    const centered = [] // [id, x, w]: text centered in w, placed once measured
    const owner = new Map() // item element id → [slide, step, shown opacity]
    const index = slides.map((slide, i) => {
      const bounds = frameBounds(slide, origins)
      const frameId = `frame-${i}`
      const children = []
      const steps = [[]]
      const media = []
      let plate = null
      slide.items.forEach((item, j) => {
        const step = item.step ?? 0
        while (steps.length <= step) steps.push([])
        if (!ITEM_KEYS[item.t]) throw new Error(`deck: unknown item type "${item.t}" in slide "${slide.name}"`)
        for (const key of Object.keys(item))
          if (!ITEM_KEYS[item.t].includes(key))
            throw new Error(`deck: ${item.t} item has unknown key "${key}" (known: ${ITEM_KEYS[item.t].join(', ')})`)
        for (const key of ITEM_REQUIRED[item.t]) need(item, key)
        if (item.step !== undefined && !(Number.isInteger(item.step) && item.step >= 0))
          throw new Error(`deck: ${item.t} item "step" must be a non-negative integer, got ${item.step}`)
        if (item.fade !== undefined && !(typeof item.fade === 'number' && item.fade >= 0 && item.fade <= 100))
          throw new Error(`deck: ${item.t} item "fade" must be a number 0–100, got ${item.fade}`)
        if (item.t === 'video' || item.t === 'image') {
          media.push({
            id: `media-${i}-${j}`,
            kind: item.t,
            src: need(item, 'src'),
            step,
            x: bounds.x + need(item, 'x'),
            y: bounds.y + need(item, 'y'),
            w: need(item, 'w'),
            h: need(item, 'h'),
          })
          return
        }
        if (item.t === 'plate' && plate === null) plate = color(item).fill
        const make = builders[item.t]
        const id = `s${i}-${j}`
        const skeleton = make(item)
        skeleton.id = id
        skeleton.x += bounds.x
        skeleton.y += bounds.y
        if (item.t === 'text' && item.align === 'middle') centered.push([id, skeleton.x, need(item, 'w')])
        skeletons.push(skeleton)
        children.push(id)
        owner.set(id, [i, step, item.fade ?? 100])
      })
      skeletons.push({ type: 'frame', id: frameId, x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h, name: slide.name, children })
      return { frameId, steps, media, bounds, via: slide.via, take: slide.take, plate }
    })

    const elements = convert(skeletons).map((el) => ({ ...el, locked: true }))
    const byId = new Map(elements.map((el) => [el.id, el]))
    for (const [id, x, w] of centered) byId.get(id).x = x + (w - byId.get(id).width) / 2
    // The converter shrinks a frame to hug its children; slides are fixed 1920×1080.
    for (const { frameId, bounds } of index) Object.assign(byId.get(frameId), { x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h })
    // The converter split labels into their own elements; containerId links one back to
    // its item, so a label reveals with (and at the opacity of) its container.
    const fades = new Map()
    for (const el of elements) {
      const ref = owner.get(el.id) ?? owner.get(el.containerId)
      if (!ref) continue
      index[ref[0]].steps[ref[1]].push(el.id)
      fades.set(el.id, ref[2])
    }
    const labels = takes.map((_, k) => byId.get(`take-${k}`)).map((el) => ({ x: el.x, y: el.y, w: el.width, h: el.height }))
    return { elements, index, labels, fades }
  }

  return { build }
}
