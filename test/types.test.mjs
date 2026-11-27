import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { createBuild, flattenTakes } from '../src/build.js'
import { stubConvert, STUB_FONT_FAMILY } from '../src/stub-convert.js'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const THEME = { background: '#ffffff', colors: {}, fonts: {} }

const { build } = createBuild({ convert: stubConvert, fontFamily: STUB_FONT_FAMILY })

/** Run tsc on a single JS file, checking it against deck.d.ts as the 'excalidraw-deck' module. */
function diagnostics(file) {
  const program = ts.createProgram([file], {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: ROOT,
    paths: { 'excalidraw-deck': ['./deck.d.ts'] },
  })
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === file)
}

test('valid-full → 0 diagnostics and build() does not throw', async () => {
  const file = join(ROOT, 'test/fixtures/valid-full/slides.js')
  const diags = diagnostics(file)
  const messages = diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  assert.deepEqual(messages, [], `unexpected diagnostics:\n${messages.join('\n')}`)

  const { takes } = await import(file)
  assert.doesNotThrow(() => build(flattenTakes(takes), takes, THEME))
})

test('bad-key → diagnostic names the bad key AND build() throws naming it', async () => {
  const file = join(ROOT, 'test/fixtures/bad-key/slides.js')
  const diags = diagnostics(file)
  const messages = diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  assert.ok(messages.length >= 1, 'expected at least one diagnostic')
  assert.ok(
    messages.some((m) => m.includes('colr')),
    `expected a diagnostic mentioning "colr"; got:\n${messages.join('\n')}`,
  )

  const { takes } = await import(file)
  assert.throws(() => build(flattenTakes(takes), takes, THEME), /unknown key "colr"/)
})
