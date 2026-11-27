import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { run } from './cli.test.mjs'

const WORKTREE = fileURLToPath(new URL('..', import.meta.url))

test('showcase passes: ok output, correct counts', () => {
  const r = run(['check'], { cwd: join(WORKTREE, 'examples/showcase') })
  assert.equal(r.code, 0)
  assert.match(r.out, /deck: ok — \d+ slides in \d+ takes/)
})

test('no deck.yaml: a minimal slides.json with no config passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-check-'))
  writeFileSync(join(dir, 'slides.json'), `{ "takes": [{ "name": "one", "slides": [{ "name": "s", "col": 0, "items": [] }] }] }\n`)
  const r = run(['check'], { cwd: dir })
  assert.equal(r.code, 0)
  assert.match(r.out, /deck: ok — \d+ slides in \d+ takes/)
})

test('unknown item key: exit 1, one-line stderr naming the key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-check-'))
  writeFileSync(join(dir, 'slides.json'), `{ "takes": [{ "name": "one", "slides": [{ "name": "s", "col": 0, "items": [{ "t": "text", "x": 0, "y": 0, "fs": 20, "text": "x", "colr": "blue" }] }] }] }\n`)
  const r = run(['check'], { cwd: dir })
  assert.equal(r.code, 1)
  assert.match(r.err, /unknown key "colr"/)
  assert.equal(r.err.trim().split('\n').length, 1)
})

test('undefined theme color: exit 1 naming the color', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-check-'))
  writeFileSync(join(dir, 'slides.json'), `{ "takes": [{ "name": "one", "slides": [{ "name": "s", "col": 0, "items": [{ "t": "text", "x": 0, "y": 0, "fs": 20, "text": "x", "color": "brand" }] }] }] }\n`)
  const r = run(['check'], { cwd: dir })
  assert.equal(r.code, 1)
  assert.match(r.err, /unknown color "brand"/)
})

test('invalid JSON in slides.json: exit 1, stderr non-empty and stack-free', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-check-'))
  writeFileSync(join(dir, 'slides.json'), `{ "takes": [\n`)
  const r = run(['check'], { cwd: dir })
  assert.equal(r.code, 1)
  assert.ok(r.err.trim().length > 0, 'stderr is non-empty')
  for (const line of r.err.trim().split('\n'))
    assert.ok(!line.includes('    at '), `stack line leaked: ${line}`)
})

test('check [dir]: a path arg is validated, not cwd', () => {
  // From repo root, `check examples/showcase` should pass
  const r = run(['check', 'examples/showcase'], { cwd: WORKTREE })
  assert.equal(r.code, 0)
  assert.match(r.out, /deck: ok — \d+ slides in \d+ takes/)
})

test('check /nonexistent: exits 1 with no-slides.json error, not a cwd ok', () => {
  const r = run(['check', '/nonexistent-deck-dir'])
  assert.equal(r.code, 1)
  assert.match(r.err, /no slides\.json/)
})
