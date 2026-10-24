// check: validates a deck through the real builders without a browser.
import { loadTakes, checkMedia } from './project.js'
import { loadConfig } from './config.js'
import { createBuild, flattenTakes } from './build.js'
import { stubConvert, STUB_FONT_FAMILY } from './stub-convert.js'

export async function checkDeck(userDir) {
  const takes = await loadTakes(userDir)
  checkMedia(userDir, takes)
  const config = loadConfig(userDir)
  const { build } = createBuild({ convert: stubConvert, fontFamily: STUB_FONT_FAMILY })
  build(flattenTakes(takes), takes, config.theme)
  return { takes, config }
}
