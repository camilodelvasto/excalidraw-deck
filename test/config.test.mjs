import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULTS, mergeConfig, loadConfig } from '../src/config.js'

const dirWith = (yaml) => {
  const dir = mkdtempSync(join(tmpdir(), 'deck-config-'))
  if (yaml !== undefined) writeFileSync(join(dir, 'deck.yaml'), yaml)
  return dir
}

test('no deck.yaml yields the defaults, as a fresh clone', () => {
  const config = loadConfig(dirWith(undefined))
  assert.deepEqual(config, DEFAULTS)
  config.behaviors.holdMs = 1
  assert.equal(DEFAULTS.behaviors.holdMs, 500, 'mutating a result must not touch DEFAULTS')
})

test('absent keys keep their defaults; present keys override', () => {
  const config = mergeConfig({ behaviors: { holdMs: 700 } })
  assert.equal(config.behaviors.holdMs, 700)
  assert.equal(config.behaviors.tapZones, DEFAULTS.behaviors.tapZones)
  assert.equal(config.theme.background, DEFAULTS.theme.background)
  assert.equal(config.deploy, null)
})

test('an unknown top-level key throws, naming it', () => {
  assert.throws(() => mergeConfig({ them: {} }), /unknown key "them"/)
})

test('an unknown nested key throws, naming its path', () => {
  assert.throws(() => mergeConfig({ behaviors: { holdms: 300 } }), /behaviors\.holdms/)
  assert.throws(() => mergeConfig({ theme: { colours: {} } }), /theme\.colours/)
})

test('bad values throw with the key path', () => {
  assert.throws(() => mergeConfig({ behaviors: { holdMs: -5 } }), /holdMs/)
  assert.throws(() => mergeConfig({ behaviors: { tapZones: 'yes' } }), /tapZones/)
  assert.throws(() => mergeConfig({ behaviors: { fullscreenButton: 'maybe' } }), /fullscreenButton/)
  assert.throws(() => mergeConfig({ theme: { background: 7 } }), /background/)
})

test('theme colors extend the table: entries need stroke and fill strings', () => {
  const config = mergeConfig({ theme: { colors: { brand: { stroke: '#ff1055', fill: '#ffd9e2' } } } })
  assert.deepEqual(config.theme.colors.brand, { stroke: '#ff1055', fill: '#ffd9e2' })
  assert.throws(() => mergeConfig({ theme: { colors: { brand: { stroke: '#f00' } } } }), /brand\.fill/)
  assert.throws(() => mergeConfig({ theme: { colors: { brand: { stroke: '#f00', fill: '#fdd', extra: 1 } } } }), /brand\.extra/)
})

test('font swaps accept only the five roles', () => {
  const config = mergeConfig({ theme: { fonts: { display: 'fonts/Lora-Variable.woff2' } } })
  assert.equal(config.theme.fonts.display, 'fonts/Lora-Variable.woff2')
  assert.throws(() => mergeConfig({ theme: { fonts: { serif: 'x.woff2' } } }), /font role "serif"/)
})

test('deploy requires remote and repo; branch and cname default to null', () => {
  const config = mergeConfig({ deploy: { remote: 'github-pages', repo: 'git@github.com:u/r.git' } })
  assert.deepEqual(config.deploy, { remote: 'github-pages', repo: 'git@github.com:u/r.git', branch: null, cname: null })
  assert.throws(() => mergeConfig({ deploy: { remote: 'github-pages' } }), /deploy\.repo/)
  assert.throws(() => mergeConfig({ deploy: { remote: 'gitlab-pages', repo: 'x' } }), /deploy\.remote/)
  assert.throws(() => mergeConfig({ deploy: { remote: 'github-pages', repo: 'x', token: 'no' } }), /deploy\.token/)
})

test('a deck.yaml that is not valid YAML throws, naming the file', () => {
  const dir = dirWith('theme: [unclosed')
  assert.throws(() => loadConfig(dir), /deck\.yaml: not valid YAML/)
})

test('a deck.yaml with real content loads and merges', () => {
  const dir = dirWith('theme:\n  background: "#faf9f7"\nbehaviors:\n  holdMs: 650\n')
  const config = loadConfig(dir)
  assert.equal(config.theme.background, '#faf9f7')
  assert.equal(config.behaviors.holdMs, 650)
  assert.equal(config.behaviors.fullscreenButton, DEFAULTS.behaviors.fullscreenButton)
})
