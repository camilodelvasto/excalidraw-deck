// The CLI contract: a wrong invocation prints the usage line and exits non-zero.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const BIN = fileURLToPath(new URL('../bin/deck.js', import.meta.url))
export function run(args, opts = {}) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [BIN, ...args], { encoding: 'utf8', stdio: 'pipe', ...opts }) }
  } catch (e) {
    return { code: e.status, err: e.stderr ?? '' }
  }
}

test('no command prints usage and exits non-zero', () => {
  const r = run([])
  assert.notEqual(r.code, 0)
  assert.match(r.err, /usage: excalidraw-deck dev \| build \| deploy \| check/)
})

test('an unknown command prints usage and exits non-zero', () => {
  const r = run(['serve'])
  assert.notEqual(r.code, 0)
  assert.match(r.err, /usage: excalidraw-deck/)
})

test('deck deploy without a deploy section says what to add', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'deck-nodeploy-'))
  writeFileSync(join(dir, 'slides.js'), `export const takes = [{ name: 'one', slides: [{ name: 's', col: 0, items: [] }] }]\n`)
  const r = run(['deploy'], { cwd: dir })
  assert.notEqual(r.code, 0)
  assert.match(r.err, /deck\.yaml has no deploy section/)
})
