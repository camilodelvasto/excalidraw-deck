// slides.schema.json is a second declaration of the slide-item contract; this test pins it
// to src/build.js exports so the two cannot drift. Structure is compared, not values the
// builder owns.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ITEM_KEYS, ITEM_REQUIRED, STOCK_COLORS, GEOS, FILLS, DASHES, ALIGNS, VALIGNS } from '../src/build.js'
import { ROLES } from '../src/config.js'

const schema = JSON.parse(readFileSync(fileURLToPath(new URL('../schemas/slides.schema.json', import.meta.url)), 'utf8'))

// Collect oneOf variants by each variant's `t` const value.
function itemVariants(s) {
  const variants = {}
  for (const v of s.items.properties.slides.items.properties.items.items.oneOf) {
    const t = v.properties.t.const
    variants[t] = v
  }
  return variants
}

function colorDef(s) {
  return s.$defs.color
}

test('root is an array of takes, each take has name and slides required', () => {
  assert.equal(schema.type, 'array')
  const take = schema.items
  assert.equal(take.type, 'object')
  assert.equal(take.additionalProperties, false)
  assert.deepEqual([...take.required].sort(), ['name', 'slides'])
  assert.ok(take.properties.name)
  assert.ok(take.properties.slides)
})

test('slide has name, col, items required; via is const "overview"; additionalProperties false', () => {
  const slide = schema.items.properties.slides.items
  assert.equal(slide.type, 'object')
  assert.equal(slide.additionalProperties, false)
  assert.deepEqual([...slide.required].sort(), ['col', 'items', 'name'])
  assert.equal(slide.properties.via.const, 'overview')
})

test('every item variant mirrors ITEM_KEYS and ITEM_REQUIRED and rejects unknown keys', () => {
  const variants = itemVariants(schema)
  assert.deepEqual(Object.keys(variants).sort(), Object.keys(ITEM_KEYS).sort())
  for (const [t, v] of Object.entries(variants)) {
    assert.equal(v.additionalProperties, false, t)
    assert.deepEqual(Object.keys(v.properties).sort(), [...ITEM_KEYS[t]].sort(), t)
    assert.deepEqual([...v.required].sort(), [...ITEM_REQUIRED[t], 't'].sort(), t)
  }
})

test('enums match the builder: colors anyOf stock+string, fonts, fills, dashes, geos, aligns', () => {
  const color = colorDef(schema)
  assert.deepEqual(color.anyOf[0].enum, Object.keys(STOCK_COLORS))
  assert.deepEqual(color.anyOf[1], { type: 'string' })
  assert.deepEqual(schema.$defs.font.enum, ROLES)
  assert.deepEqual(schema.$defs.fill.enum, Object.keys(FILLS))
  assert.deepEqual(schema.$defs.dash.enum, Object.keys(DASHES))
  assert.deepEqual(schema.$defs.geo.enum, Object.keys(GEOS))
  assert.deepEqual(schema.$defs.align.enum, Object.keys(ALIGNS))
  assert.deepEqual(schema.$defs.valign.enum, Object.keys(VALIGNS))
})

test('step is integer minimum 0; fade is number 0–100; from/to are arrays of exactly 2 numbers', () => {
  const { step, fade, from, to } = schema.$defs
  assert.equal(step.type, 'integer')
  assert.equal(step.minimum, 0)
  assert.equal(fade.type, 'number')
  assert.equal(fade.minimum, 0)
  assert.equal(fade.maximum, 100)
  assert.equal(from.type, 'array')
  assert.equal(from.minItems, 2)
  assert.equal(from.maxItems, 2)
  assert.equal(from.items.type, 'number')
  assert.equal(to.type, 'array')
  assert.equal(to.minItems, 2)
  assert.equal(to.maxItems, 2)
  assert.equal(to.items.type, 'number')
})
