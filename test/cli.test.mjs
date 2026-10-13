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
  assert.match(r.err, /usage: excalidraw-deck dev \| build \| deploy/)
})

test('an unknown command prints usage and exits non-zero', () => {
  const r = run(['serve'])
  assert.notEqual(r.code, 0)
  assert.match(r.err, /usage: excalidraw-deck/)
})
