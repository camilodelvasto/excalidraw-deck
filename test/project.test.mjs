import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadTakes, checkMedia } from '../src/project.js'
import { assetCandidates } from '../src/vite.js'

const project = (slidesJs) => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-project-'))
  if (slidesJs !== undefined) writeFileSync(join(dir, 'slides.js'), slidesJs)
  return dir
}
const ONE_TAKE = `export const takes = [{ name: 'one', slides: [{ name: 's1', col: 0, items: [] }] }]\n`

test('a valid project loads its takes', async () => {
  const takes = await loadTakes(project(ONE_TAKE))
  assert.equal(takes.length, 1)
  assert.equal(takes[0].name, 'one')
})

test('no slides.js: the error names the contract and the scaffold', async () => {
  await assert.rejects(loadTakes(project(undefined)), /no slides\.js .* examples\/showcase/s)
})

test('slides.js without a non-empty takes export throws', async () => {
  await assert.rejects(loadTakes(project('export const takes = []\n')), /non-empty `takes` array/)
  await assert.rejects(loadTakes(project('export default 42\n')), /non-empty `takes` array/)
  await assert.rejects(loadTakes(project(`export const takes = [{ slides: [{ name: 's', col: 0, items: [] }] }]\n`)), /each take needs a name/)
})

test('a slide with non-array items throws, naming the take', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'one', slides: [{ name: 's1', col: 0, items: 5 }] }]\n`)),
    /deck:.*take "one".*items.*array/s,
  )
})

test('a slide missing name throws', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'two', slides: [{ col: 0, items: [] }] }]\n`)),
    /deck:.*take "two".*name/s,
  )
})

test('a slide with non-numeric col throws', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'three', slides: [{ name: 's1', col: 'x', items: [] }] }]\n`)),
    /deck:.*take "three".*col/s,
  )
})

test('a media item pointing at a missing file throws, naming the slide and the path', async () => {
  const dir = project(`export const takes = [{ name: 'one', slides: [
    { name: 'demo', col: 0, items: [{ t: 'image', x: 0, y: 0, w: 100, h: 100, src: 'media/missing.png' }] },
  ] }]\n`)
  const takes = await loadTakes(dir)
  assert.throws(() => checkMedia(dir, takes), /slide "demo".*media\/missing\.png/s)
  mkdirSync(join(dir, 'media'))
  writeFileSync(join(dir, 'media', 'missing.png'), 'x')
  checkMedia(dir, takes) // present → no throw
})

test('a media src outside media/ throws, even if the file exists', async () => {
  const dir = project(`export const takes = [{ name: 'one', slides: [
    { name: 'demo', col: 0, items: [{ t: 'image', x: 0, y: 0, w: 100, h: 100, src: 'elsewhere/pic.png' }] },
  ] }]\n`)
  mkdirSync(join(dir, 'elsewhere'))
  writeFileSync(join(dir, 'elsewhere', 'pic.png'), 'x')
  const takes = await loadTakes(dir)
  assert.throws(() => checkMedia(dir, takes), /slide "demo".*must point into media\//s)
})

test('a media src escaping media/ with .. throws', async () => {
  const dir = project(`export const takes = [{ name: 'one', slides: [
    { name: 'demo', col: 0, items: [{ t: 'video', x: 0, y: 0, w: 100, h: 100, src: 'media/../../etc/passwd' }] },
  ] }]\n`)
  const takes = await loadTakes(dir)
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

test('an unknown take key throws naming it', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'one', nslides: [], slides: [{ name: 's', col: 0, items: [] }] }]\n`)),
    /deck:.*unknown key "nslides" in take "one"/s,
  )
})

test('an unknown slide key throws naming it', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'one', slides: [{ name: 's', col: 0, items: [], vai: 'overview' }] }]\n`)),
    /deck:.*unknown key "vai" in slide "s"/s,
  )
})

test('via with an unrecognised value throws naming it', async () => {
  await assert.rejects(
    loadTakes(project(`export const takes = [{ name: 'one', slides: [{ name: 's', col: 0, items: [], via: 'overveiw' }] }]\n`)),
    /deck:.*"via" must be "overview", got "overveiw"/s,
  )
})
