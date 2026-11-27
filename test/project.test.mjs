import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadTakes, parseTakes, checkMedia } from '../src/project.js'
import { assetCandidates, makeViteConfig, mime } from '../src/vite.js'

const project = (doc) => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-project-'))
  if (doc !== undefined) writeFileSync(join(dir, 'slides.json'), typeof doc === 'string' ? doc : JSON.stringify(doc))
  return dir
}
const take = (slides) => ({ name: 'one', slides })
const slide = (items = [], extra = {}) => ({ name: 's1', col: 0, items, ...extra })
const ONE_TAKE = { takes: [take([slide()])] }

test('a valid project loads its takes', () => {
  const takes = loadTakes(project(ONE_TAKE))
  assert.equal(takes.length, 1)
  assert.equal(takes[0].name, 'one')
})

test('a $schema key at the root is allowed and ignored', () => {
  const takes = loadTakes(project({ $schema: 'https://example.com/slides.schema.json', ...ONE_TAKE }))
  assert.equal(takes.length, 1)
})

test('no slides.json: the error names the contract and the scaffold', () => {
  assert.throws(() => loadTakes(project(undefined)), /no slides\.json .* examples\/showcase/s)
})

test('a slides.js from the executable era gets a migration error, and is never run', () => {
  const dir = project(undefined)
  writeFileSync(join(dir, 'slides.js'), `throw new Error('must never execute')\n`)
  assert.throws(() => loadTakes(dir), /slides\.js is no longer supported/)
})

test('invalid JSON throws one line naming the file', () => {
  assert.throws(() => loadTakes(project('{ "takes": [')), /slides\.json is not valid JSON/)
})

test('a non-object root throws naming the expected shape', () => {
  assert.throws(() => parseTakes('[]'), /root must be an object: \{ "takes": \[\.\.\.\] \}/)
  assert.throws(() => parseTakes('"takes"'), /root must be an object/)
})

test('an unknown root key throws naming it', () => {
  assert.throws(() => loadTakes(project({ takes: ONE_TAKE.takes, slides: [] })), /unknown key "slides" in slides\.json/)
})

test('a missing or empty takes array throws', () => {
  assert.throws(() => loadTakes(project({ takes: [] })), /non-empty "takes" array/)
  assert.throws(() => loadTakes(project({ $schema: 'x' })), /non-empty "takes" array/)
  assert.throws(() => loadTakes(project({ takes: [{ slides: [slide()] }] })), /each take needs a name/)
})

test('a slide with non-array items throws, naming the take', () => {
  assert.throws(() => loadTakes(project({ takes: [take([{ name: 's1', col: 0, items: 5 }])] })), /deck:.*take "one".*items.*array/s)
})

test('a slide missing name throws', () => {
  assert.throws(() => loadTakes(project({ takes: [take([{ col: 0, items: [] }])] })), /deck:.*take "one".*name/s)
})

test('a slide with non-numeric col throws', () => {
  assert.throws(() => loadTakes(project({ takes: [take([{ name: 's1', col: 'x', items: [] }])] })), /deck:.*take "one".*col/s)
})

test('a media item pointing at a missing file throws, naming the slide and the path', () => {
  const dir = project({ takes: [take([slide([{ t: 'image', x: 0, y: 0, w: 100, h: 100, src: 'media/missing.png' }], { name: 'demo' })])] })
  const takes = loadTakes(dir)
  assert.throws(() => checkMedia(dir, takes), /slide "demo".*media\/missing\.png/s)
  mkdirSync(join(dir, 'media'))
  writeFileSync(join(dir, 'media', 'missing.png'), 'x')
  checkMedia(dir, takes) // present → no throw
})

test('a media src outside media/ throws, even if the file exists', () => {
  const dir = project({ takes: [take([slide([{ t: 'image', x: 0, y: 0, w: 100, h: 100, src: 'elsewhere/pic.png' }], { name: 'demo' })])] })
  mkdirSync(join(dir, 'elsewhere'))
  writeFileSync(join(dir, 'elsewhere', 'pic.png'), 'x')
  const takes = loadTakes(dir)
  assert.throws(() => checkMedia(dir, takes), /slide "demo".*must point into media\//s)
})

test('a media src escaping media/ with .. throws', () => {
  const dir = project({ takes: [take([slide([{ t: 'video', x: 0, y: 0, w: 100, h: 100, src: 'media/../../etc/passwd' }], { name: 'demo' })])] })
  const takes = loadTakes(dir)
  assert.throws(() => checkMedia(dir, takes), /slide "demo".*must point into media\//s)
})

// assetCandidates: pure path math, no fs access needed
const U = '/tmp/u'
const F = '/tmp/f'

test('assetCandidates: path traversal in /fonts/ is dropped from both roots', () => {
  assert.deepEqual(assetCandidates('/fonts/../../x', U, F), [])
})

test('assetCandidates: path traversal that escapes /media/ root is dropped', () => {
  assert.deepEqual(assetCandidates('/media/../../etc/passwd', U, F), [])
})

test('assetCandidates: /fonts/ url returns two candidates, userDir first then fontsDir', () => {
  const result = assetCandidates('/fonts/Virgil/a.woff2', U, F)
  assert.equal(result.length, 2)
  assert.ok(result[0].startsWith(U + '/'), `first candidate must be under userDir, got ${result[0]}`)
  assert.ok(result[1].startsWith(F + '/'), `second candidate must be under fontsDir, got ${result[1]}`)
})

test('assetCandidates: /media/ url returns one candidate under userDir', () => {
  const result = assetCandidates('/media/pic.svg', U, F)
  assert.equal(result.length, 1)
  assert.ok(result[0].startsWith(U + '/'), `candidate must be under userDir, got ${result[0]}`)
})

test('assetCandidates: unrecognised prefix returns empty', () => {
  assert.deepEqual(assetCandidates('/elsewhere', U, F), [])
})

test('dev and build use separate Vite caches — a build cannot corrupt a running dev server', () => {
  const dev = makeViteConfig({ userDir: '/tmp/u', command: 'dev' })
  const build = makeViteConfig({ userDir: '/tmp/u', command: 'build' })
  assert.notEqual(dev.cacheDir, build.cacheDir)
})

test('the deck virtuals read slides.json and deck.yaml fresh on every load', () => {
  const dir = project(ONE_TAKE)
  writeFileSync(join(dir, 'deck.yaml'), 'theme: { background: "#111111" }\n')
  const virt = makeViteConfig({ userDir: dir, command: 'dev' }).plugins.find((p) => p.name === 'deck-virtuals')
  assert.match(virt.load('\0deck-config'), /#111111/)
  writeFileSync(join(dir, 'deck.yaml'), 'theme: { background: "#222222" }\n')
  assert.match(virt.load('\0deck-config'), /#222222/)
  assert.match(virt.load('\0deck-slides'), /"name":"one"/)
  writeFileSync(join(dir, 'slides.json'), JSON.stringify({ takes: [{ name: 'two', slides: [slide()] }] }))
  assert.match(virt.load('\0deck-slides'), /"name":"two"/)
})

test('mime: known extensions map, unknown ones fall back to a byte stream', () => {
  assert.equal(mime('/x/clip.mp4'), 'video/mp4')
  assert.equal(mime('/x/notes.txt'), 'application/octet-stream')
})

test('an unknown take key throws naming it', () => {
  assert.throws(() => loadTakes(project({ takes: [{ name: 'one', nslides: [], slides: [slide()] }] })), /deck:.*unknown key "nslides" in take "one"/s)
})

test('an unknown slide key throws naming it', () => {
  assert.throws(() => loadTakes(project({ takes: [take([slide([], { vai: 'overview' })])] })), /deck:.*unknown key "vai" in slide "s1"/s)
})

test('via with an unrecognised value throws naming it', () => {
  assert.throws(() => loadTakes(project({ takes: [take([slide([], { via: 'overveiw' })])] })), /deck:.*"via" must be "overview", got "overveiw"/s)
})
