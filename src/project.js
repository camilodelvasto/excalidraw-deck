// The user's project IS the contract: a folder with slides.js exporting non-empty takes,
// and media files that exist for every video/image item. Violations throw before Vite runs,
// so the user sees one line, not a bundler stack.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

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
    for (const s of t.slides) {
      if (typeof s !== 'object' || s === null || typeof s.name !== 'string' || !s.name)
        throw new Error(`deck: take "${t.name}" has a slide missing a non-empty string name`)
      if (!Number.isFinite(s.col))
        throw new Error(`deck: take "${t.name}" slide "${s.name}" — col must be a finite number, got ${JSON.stringify(s.col)}`)
      if (!Array.isArray(s.items))
        throw new Error(`deck: take "${t.name}" slide "${s.name}" — items must be an array, got ${JSON.stringify(s.items)}`)
    }
  }
  return takes
}

export function checkMedia(userDir, takes) {
  for (const t of takes)
    for (const s of t.slides)
      for (const item of s.items ?? [])
        if ((item.t === 'video' || item.t === 'image') && !existsSync(join(userDir, item.src)))
          throw new Error(`deck: slide "${s.name}" uses ${item.src}, but ${join(userDir, item.src)} does not exist`)
}
