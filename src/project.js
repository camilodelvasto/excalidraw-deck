import { existsSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const TAKE_KEYS = new Set(['name', 'slides'])
const SLIDE_KEYS = new Set(['name', 'col', 'via', 'items'])

export async function loadTakes(userDir) {
  const file = join(userDir, 'slides.js')
  if (!existsSync(file))
    throw new Error(`deck: no slides.js in ${userDir} — a deck is a folder with slides.js (copy examples/showcase to start)`)
  const mod = await import(pathToFileURL(file).href)
  const takes = mod.takes
  if (!Array.isArray(takes) || takes.length === 0) throw new Error('deck: slides.js must export a non-empty `takes` array')
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
