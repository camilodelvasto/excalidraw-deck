import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBuild, FRAME, STOCK_COLORS, ITEM_KEYS, ITEM_REQUIRED } from '../src/build.js'

// A faithful stand-in for convertToExcalidrawElements' CONTRACT: measures text, keeps ids,
// splits a `label` into a bound text element with containerId. Tests assert contracts the
// deck format promises, not Excalidraw's numbers.
function fakeConvert(skeletons) {
  const out = []
  for (const s of skeletons) {
    const { label, ...el } = s
    if (el.type === 'text') {
      el.width ??= el.text.length * el.fontSize * 0.6
      el.height ??= el.fontSize * 1.25
    }
    el.width ??= 0
    el.height ??= 0
    out.push(el)
    if (label) out.push({ type: 'text', id: `${el.id}-label`, containerId: el.id, x: el.x, y: el.y, width: 10, height: 10, ...label })
  }
  return out
}
const fakeFontFamily = { 'Liberation Sans': 8, Virgil: 1, Nunito: 6, Cascadia: 7, Excalifont: 5 }
const { build } = createBuild({ convert: fakeConvert, fontFamily: fakeFontFamily })
const THEME = { background: '#ffffff', colors: {}, fonts: {} }

const slide = (items, extra = {}) => ({ name: 's', col: 0, take: 0, items, ...extra })
const TAKES = [{ name: 'one', slides: [] }]

test('every element is locked and every slide gets a full 1920×1080 frame', () => {
  const { elements, index } = build([slide([{ t: 'text', x: 10, y: 10, fs: 32, text: 'hi' }])], TAKES, THEME)
  assert.ok(elements.length > 0)
  for (const el of elements) assert.equal(el.locked, true)
  const frame = elements.find((el) => el.id === index[0].frameId)
  assert.equal(frame.width, FRAME.w)
  assert.equal(frame.height, FRAME.h)
})

test('unknown item type, color and font throw, naming the offender', () => {
  assert.throws(() => build([slide([{ t: 'blob', x: 0, y: 0 }])], TAKES, THEME), /unknown item type "blob"/)
  assert.throws(() => build([slide([{ t: 'text', x: 0, y: 0, fs: 20, text: 'x', color: 'mauve' }])], TAKES, THEME), /unknown color "mauve"/)
  assert.throws(() => build([slide([{ t: 'text', x: 0, y: 0, fs: 20, text: 'x', font: 'serif' }])], TAKES, THEME), /unknown font "serif"/)
})

test('a missing required key throws with the item type and key', () => {
  assert.throws(() => build([slide([{ t: 'box', x: 0, y: 0, h: 100, text: '' }])], TAKES, THEME), /box item is missing "w"/)
  assert.throws(() => build([slide([{ t: 'text', x: 0, y: 0, fs: 20 }])], TAKES, THEME), /text item is missing "text"/)
})

test('theme colors extend the stock table without replacing it', () => {
  const theme = { ...THEME, colors: { brand: { stroke: '#ff1055', fill: '#ffd9e2' } } }
  const { elements } = build(
    [slide([
      { t: 'text', x: 0, y: 0, fs: 20, text: 'a', color: 'brand' },
      { t: 'text', x: 0, y: 40, fs: 20, text: 'b', color: 'blue' },
    ])],
    TAKES, theme)
  const [a, b] = [elements.find((e) => e.id === 's0-0'), elements.find((e) => e.id === 's0-1')]
  assert.equal(a.strokeColor, '#ff1055')
  assert.equal(b.strokeColor, STOCK_COLORS.blue.stroke)
})

test('steps group element ids; a bound label reveals with its container', () => {
  const { index, fades } = build(
    [slide([
      { t: 'text', x: 0, y: 0, fs: 20, text: 'always' },
      { t: 'box', x: 0, y: 40, w: 100, h: 50, text: 'later', step: 2, fade: 40 },
    ])],
    TAKES, THEME)
  const steps = index[0].steps
  assert.equal(steps.length, 3, 'step: 2 makes three steps (0, 1, 2)')
  assert.ok(steps[0].includes('s0-0'))
  assert.ok(steps[2].includes('s0-1'))
  assert.ok(steps[2].includes('s0-1-label'), 'the label reveals with its container')
  assert.equal(fades.get('s0-1'), 40)
  assert.equal(fades.get('s0-1-label'), 40)
  assert.equal(fades.get('s0-0'), 100, 'no fade declared → full opacity')
})

test('video and image items become media entries in scene coordinates, not elements', () => {
  const { elements, index } = build(
    [slide([{ t: 'image', x: 100, y: 200, w: 800, h: 450, src: 'media/demo.svg', step: 1 }], { col: 1 })],
    TAKES, THEME)
  assert.equal(elements.filter((e) => e.type === 'image').length, 0)
  const [m] = index[0].media
  assert.equal(m.kind, 'image')
  assert.equal(m.src, 'media/demo.svg')
  assert.equal(m.step, 1)
  assert.equal(m.x, 1 * (FRAME.w + FRAME.gap) + 100, 'frame-relative x landed in scene coordinates')
  assert.equal(m.y, 200)
})

test('a second take starts below the first block; col -1 sits behind the opening', () => {
  const slides = [
    { name: 'a', col: 0, take: 0, items: [] },
    { name: 'a-close', col: -1, take: 0, items: [] },
    { name: 'b', col: 0, take: 1, items: [] },
  ]
  const takes = [{ name: 'one', slides: [] }, { name: 'two', slides: [] }]
  const { index } = build(slides, takes, THEME)
  assert.ok(index[2].bounds.y > index[0].bounds.y, 'take 1 is below take 0')
  assert.ok(index[1].bounds.x < 0, 'col -1 sits left of the opening, off the row')
  assert.equal(index[1].bounds.y, index[0].bounds.y)
})

test('centered text is re-placed once measured: x moves to center within the declared width', () => {
  const { elements } = build(
    [slide([{ t: 'text', x: 100, y: 0, fs: 20, text: 'hi', align: 'middle', w: 600 }])],
    TAKES, THEME)
  const el = elements.find((e) => e.id === 's0-0')
  assert.equal(el.x, 100 + (600 - el.width) / 2)
})

test('an unknown item key throws, naming the type, key, and known keys', () => {
  assert.throws(() => build([slide([{ t: 'text', x: 0, y: 0, fs: 20, text: 'x', colr: 'blue' }])], TAKES, THEME),
    /text item has unknown key "colr" \(known: /)
  assert.throws(() => build([slide([{ t: 'image', x: 0, y: 0, w: 10, h: 10, src: 'm.svg', fade: 50 }])], TAKES, THEME),
    /image item has unknown key "fade"/)
})

test('every ITEM_REQUIRED key throws when absent; the full valid item builds', () => {
  const VALID = {
    text: { t: 'text', x: 0, y: 0, fs: 20, text: 'x' },
    box: { t: 'box', x: 0, y: 0, w: 10, h: 10, text: '' },
    note: { t: 'note', x: 0, y: 0, size: 100, text: 'x', fs: 20 },
    plate: { t: 'plate' },
    arrow: { t: 'arrow', from: [0, 0], to: [1, 1] },
    line: { t: 'line', from: [0, 0], to: [1, 1] },
    slot: { t: 'slot', x: 0, y: 0, w: 10, h: 10, label: 'x' },
    video: { t: 'video', x: 0, y: 0, w: 10, h: 10, src: 'm.mp4' },
    image: { t: 'image', x: 0, y: 0, w: 10, h: 10, src: 'm.svg' },
  }
  for (const [t, item] of Object.entries(VALID)) {
    build([slide([item])], TAKES, THEME)
    for (const key of ITEM_REQUIRED[t]) {
      const broken = { ...item }; delete broken[key]
      assert.throws(() => build([slide([broken])], TAKES, THEME), /is missing/, `${t} without ${key}`)
    }
  }
})

test('ITEM_KEYS covers every builder and every required key', () => {
  assert.deepEqual(Object.keys(ITEM_KEYS).sort(), Object.keys(ITEM_REQUIRED).sort())
  for (const [t, req] of Object.entries(ITEM_REQUIRED))
    for (const key of req) assert.ok(ITEM_KEYS[t].includes(key), `${t}.${key}`)
})
