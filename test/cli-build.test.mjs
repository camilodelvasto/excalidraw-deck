// Slow (~20–60s): bundles Excalidraw once.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from './cli.test.mjs'

const SLIDES = `export const takes = [{ name: 'one', slides: [
  { name: 's1', col: 0, items: [
    { t: 'text', x: 120, y: 110, fs: 48, text: 'hello' },
    { t: 'image', x: 120, y: 300, w: 400, h: 300, src: 'media/pic.svg', step: 1 },
  ] },
] }]\n`
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#ff1055"/></svg>\n'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'deck-fixture-'))
  writeFileSync(join(dir, 'slides.js'), SLIDES)
  mkdirSync(join(dir, 'media'))
  writeFileSync(join(dir, 'media', 'pic.svg'), SVG)
  return dir
}

test('deck build emits a self-contained dist/: html, hashed assets, fonts, media', { timeout: 120_000 }, () => {
  const dir = fixture()
  const r = run(['build'], { cwd: dir })
  assert.equal(r.code, 0, r.err)
  const dist = join(dir, 'dist')
  assert.ok(existsSync(join(dist, 'index.html')))
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  assert.match(html, /"\.\/assets\//, 'asset urls are relative — the deck serves from any sub-path')
  assert.ok(readdirSync(join(dist, 'fonts')).length > 0, 'Excalidraw fonts are bundled, no CDN')
  assert.ok(existsSync(join(dist, 'fonts', 'Virgil')), 'font families keep their directory layout')
  assert.equal(readFileSync(join(dist, 'media', 'pic.svg'), 'utf8'), SVG, 'user media ships with the build')
})

test('deck build fails fast, with one line, on a broken project', { timeout: 60_000 }, () => {
  const empty = mkdtempSync(join(tmpdir(), 'deck-empty-'))
  const r1 = run(['build'], { cwd: empty })
  assert.notEqual(r1.code, 0)
  assert.match(r1.err, /deck: no slides\.js/)

  const dir = fixture()
  writeFileSync(join(dir, 'slides.js'), SLIDES.replace('media/pic.svg', 'media/gone.svg'))
  const r2 = run(['build'], { cwd: dir })
  assert.notEqual(r2.code, 0)
  assert.match(r2.err, /slide "s1" uses media\/gone\.svg/)
})

test('the showcase deck builds — the scaffold is never allowed to rot', { timeout: 120_000 }, () => {
  const showcase = fileURLToPath(new URL('../examples/showcase', import.meta.url))
  const r = run(['build'], { cwd: showcase })
  assert.equal(r.code, 0, r.err)
  assert.ok(existsSync(join(showcase, 'dist', 'index.html')))
})
