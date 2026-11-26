import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DEFAULTS, ROLES, REMOTES } from '../src/config.js'

const schema = JSON.parse(readFileSync(fileURLToPath(new URL('../schemas/deck.schema.json', import.meta.url)), 'utf8'))

test('top level mirrors DEFAULTS and rejects unknown keys', () => {
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(DEFAULTS).sort())
  assert.equal(schema.additionalProperties, false)
})

test('every section rejects unknown keys and mirrors the loader', () => {
  const { theme, behaviors, deploy } = schema.properties
  assert.equal(theme.additionalProperties, false)
  assert.deepEqual(Object.keys(theme.properties).sort(), Object.keys(DEFAULTS.theme).sort())
  assert.equal(behaviors.additionalProperties, false)
  assert.deepEqual(Object.keys(behaviors.properties).sort(), Object.keys(DEFAULTS.behaviors).sort())
  assert.equal(deploy.additionalProperties, false)
  assert.deepEqual(Object.keys(deploy.properties).sort(), ['branch', 'cname', 'remote', 'repo'])
  assert.deepEqual([...deploy.required].sort(), ['remote', 'repo'])
})

test('color entries require stroke and fill, nothing else; holdMs must be positive', () => {
  const entry = schema.properties.theme.properties.colors.additionalProperties
  assert.equal(entry.additionalProperties, false)
  assert.deepEqual([...entry.required].sort(), ['fill', 'stroke'])
  assert.deepEqual(Object.keys(entry.properties).sort(), ['fill', 'stroke'])
  assert.equal(schema.properties.behaviors.properties.holdMs.exclusiveMinimum, 0)
})

test('enums match the loader: font roles, remotes, fullscreenButton', () => {
  assert.deepEqual(Object.keys(schema.properties.theme.properties.fonts.properties).sort(), [...ROLES].sort())
  assert.deepEqual(schema.properties.deploy.properties.remote.enum, REMOTES)
  assert.deepEqual(schema.properties.behaviors.properties.fullscreenButton.enum, ['auto', true, false])
})

test('declared defaults match DEFAULTS', () => {
  assert.equal(schema.properties.theme.properties.background.default, DEFAULTS.theme.background)
  assert.equal(schema.properties.behaviors.properties.holdMs.default, DEFAULTS.behaviors.holdMs)
  assert.equal(schema.properties.behaviors.properties.tapZones.default, DEFAULTS.behaviors.tapZones)
  assert.equal(schema.properties.behaviors.properties.fullscreenButton.default, DEFAULTS.behaviors.fullscreenButton)
})
