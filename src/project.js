import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

const ROOT_KEYS = new Set(['$schema', 'takes'])
const TAKE_KEYS = new Set(['name', 'slides'])
const SLIDE_KEYS = new Set(['name', 'col', 'via', 'items'])

// A deck is pure data: slides.json is parsed, never executed.
export function parseTakes(raw) {
  let doc
  try {
    doc = JSON.parse(raw)
  } catch (e) {
    throw new Error(`deck: slides.json is not valid JSON — ${e.message}`)
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc))
    throw new Error('deck: the slides.json root must be an object: { "takes": [...] }')
  for (const key of Object.keys(doc))
    if (!ROOT_KEYS.has(key)) throw new Error(`deck: unknown key "${key}" in slides.json (known: ${[...ROOT_KEYS].join(', ')})`)
  const takes = doc.takes
  if (!Array.isArray(takes) || takes.length === 0) throw new Error('deck: slides.json must have a non-empty "takes" array')
  for (const t of takes) {
    if (typeof t.name !== 'string' || !t.name || !Array.isArray(t.slides) || t.slides.length === 0)
      throw new Error('deck: each take needs a name and a non-empty slides array')
    for (const key of Object.keys(t))
      if (!TAKE_KEYS.has(key))
        throw new Error(`deck: unknown key "${key}" in take "${t.name}" (known: ${[...TAKE_KEYS].join(', ')})`)
    for (const s of t.slides) {
      if (typeof s !== 'object' || s === null || typeof s.name !== 'string' || !s.name)
        throw new Error(`deck: take "${t.name}" has a slide missing a non-empty string name`)
      if (!Number.isFinite(s.col))
        throw new Error(`deck: take "${t.name}" slide "${s.name}" — col must be a finite number, got ${JSON.stringify(s.col)}`)
      if (!Array.isArray(s.items))
        throw new Error(`deck: take "${t.name}" slide "${s.name}" — items must be an array, got ${JSON.stringify(s.items)}`)
      for (const key of Object.keys(s))
        if (!SLIDE_KEYS.has(key))
          throw new Error(`deck: unknown key "${key}" in slide "${s.name}" (known: ${[...SLIDE_KEYS].join(', ')})`)
      if (s.via !== undefined && s.via !== 'overview')
        throw new Error(`deck: slide "${s.name}" — "via" must be "overview", got ${JSON.stringify(s.via)}`)
    }
  }
  return takes
}

export function loadTakes(userDir) {
  const file = join(userDir, 'slides.json')
  if (!existsSync(file)) {
    if (existsSync(join(userDir, 'slides.js')))
      throw new Error('deck: slides.js is no longer supported — a deck is pure data. Move your takes into slides.json as { "takes": [...] } (the README shows a one-line converter)')
    throw new Error(`deck: no slides.json in ${userDir} — a deck is a folder with slides.json (copy examples/showcase to start)`)
  }
  return parseTakes(readFileSync(file, 'utf8'))
}

export function checkMedia(userDir, takes) {
  // Only media/ ships with a build; a src elsewhere would 404 after deploy.
  const mediaRoot = resolve(userDir, 'media')
  for (const t of takes)
    for (const s of t.slides)
      for (const item of s.items ?? []) {
        if (item.t !== 'video' && item.t !== 'image') continue
        if (typeof item.src !== 'string' || !item.src.startsWith('media/') || !resolve(userDir, item.src).startsWith(mediaRoot + sep))
          throw new Error(`deck: slide "${s.name}" — src must point into media/ inside the deck folder, got ${JSON.stringify(item.src)}`)
        if (!existsSync(join(userDir, item.src)))
          throw new Error(`deck: slide "${s.name}" uses ${item.src}, but ${join(userDir, item.src)} does not exist`)
      }
}
