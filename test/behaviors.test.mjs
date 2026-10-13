import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import { keyAction, createTapGrammar, fullscreenButtonVisible, TAP_SLOP } from '../src/behaviors.js'

const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods })

test('keys map to actions; modifier chords belong to the browser', () => {
  assert.deepEqual(keyAction(key(' ')), { type: 'next' })
  assert.deepEqual(keyAction(key('PageDown')), { type: 'next' })
  assert.deepEqual(keyAction(key('ArrowLeft')), { type: 'prev' })
  assert.deepEqual(keyAction(key('o')), { type: 'overview' })
  assert.deepEqual(keyAction(key('3')), { type: 'digit', digit: '3' })
  assert.deepEqual(keyAction(key('Enter')), { type: 'enter' })
  assert.deepEqual(keyAction(key('+')), { type: 'zoomIn' })
  assert.deepEqual(keyAction(key('-')), { type: 'zoomOut' })
  assert.deepEqual(keyAction(key('Escape')), { type: 'reframe' })
  assert.deepEqual(keyAction(key('e')), { type: 'edit' })
  assert.deepEqual(keyAction(key('f')), { type: 'fullscreen' })
  assert.deepEqual(keyAction(key('q')), { type: 'swallow' }, 'presenting owns the keyboard')
  assert.equal(keyAction(key('r', { metaKey: true })), null, "cmd-R stays the browser's")
})

// A grammar wired to counters, with a short hold for test speed. Width 1000:
// x<350 is the prev zone, x>650 the next zone, between them the middle.
function grammar(overrides = {}) {
  const log = { next: 0, prev: 0 }
  const g = createTapGrammar({
    holdMs: 30,
    tapZones: true,
    viewportWidth: () => 1000,
    inert: () => false,
    onNext: () => log.next++,
    onPrev: () => log.prev++,
    ...overrides,
  })
  const at = (x, y = 100, button = 0) => ({ clientX: x, clientY: y, button })
  return { g, log, at }
}

test('a tap in the middle is next; a hold in the middle is back, release adds nothing', async () => {
  const { g, log, at } = grammar()
  g.pointerDown(at(500)); g.pointerUp(at(500))
  assert.deepEqual(log, { next: 1, prev: 0 })
  g.pointerDown(at(500))
  await sleep(60)
  assert.deepEqual(log, { next: 1, prev: 1 }, 'the hold fires at the threshold')
  g.pointerUp(at(500))
  assert.deepEqual(log, { next: 1, prev: 1 }, 'release after a hold does nothing more')
})

test('zones act on release: left 35% is back, right 35% is next - and a long press in a zone fires exactly one action', async () => {
  const { g, log, at } = grammar()
  g.pointerDown(at(100)); g.pointerUp(at(100))
  assert.deepEqual(log, { next: 0, prev: 1 })
  g.pointerDown(at(900)); g.pointerUp(at(900))
  assert.deepEqual(log, { next: 1, prev: 1 })
  g.pointerDown(at(900))
  await sleep(60) // no hold timer in a zone
  g.pointerUp(at(900))
  assert.deepEqual(log, { next: 2, prev: 1 }, "a long press in a zone is still that zone's single action")
})

test('tapZones false: the whole viewport keeps the middle grammar', async () => {
  const { g, log, at } = grammar({ tapZones: false })
  g.pointerDown(at(100)); g.pointerUp(at(100))
  assert.deepEqual(log, { next: 1, prev: 0 }, 'left edge taps next when zones are off')
  g.pointerDown(at(100))
  await sleep(60)
  g.pointerUp(at(100))
  assert.deepEqual(log, { next: 1, prev: 1 }, 'hold-back works everywhere when zones are off')
})

test('a drag past the slop cancels the press; nothing fires', async () => {
  const { g, log, at } = grammar()
  g.pointerDown(at(500))
  g.pointerMove(at(500 + TAP_SLOP + 1))
  await sleep(60)
  g.pointerUp(at(600))
  assert.deepEqual(log, { next: 0, prev: 0 })
})

test('right-click is back; non-primary buttons and inert mode are ignored', () => {
  const { g, log, at } = grammar()
  g.contextMenu()
  assert.deepEqual(log, { next: 0, prev: 1 })
  g.pointerDown(at(500, 100, 2)); g.pointerUp(at(500, 100, 2))
  assert.deepEqual(log, { next: 0, prev: 1 }, 'button 2 presses do not tap')
  const inert = grammar({ inert: () => true })
  inert.g.pointerDown(inert.at(500)); inert.g.pointerUp(inert.at(500))
  assert.deepEqual(inert.log, { next: 0, prev: 0 }, "overview clicks are the presenter's, not taps")
})

test('cancel clears a pending hold', async () => {
  const { g, log, at } = grammar()
  g.pointerDown(at(500))
  g.cancel()
  await sleep(60)
  assert.deepEqual(log, { next: 0, prev: 0 })
})

test('fullscreen button visibility: literal booleans win, auto follows the pointer', () => {
  assert.equal(fullscreenButtonVisible(true, false), true)
  assert.equal(fullscreenButtonVisible(false, true), false)
  assert.equal(fullscreenButtonVisible('auto', true), true)
  assert.equal(fullscreenButtonVisible('auto', false), false)
  assert.throws(() => fullscreenButtonVisible('maybe', false), /fullscreenButton/)
})
