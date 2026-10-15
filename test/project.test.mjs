import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadTakes, checkMedia } from '../src/project.js'

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
