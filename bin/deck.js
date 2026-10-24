#!/usr/bin/env node
// excalidraw-deck: the user's project is data (slides.js + deck.yaml + media/);
// this binary owns the toolchain. dev serves, build emits dist/, deploy publishes it.
import { loadConfig } from '../src/config.js'
import { loadTakes, checkMedia } from '../src/project.js'
import { makeViteConfig } from '../src/vite.js'
import { checkDeck } from '../src/check.js'
import { flattenTakes } from '../src/build.js'
import { join } from 'node:path'

const USAGE = 'usage: excalidraw-deck dev | build | deploy | check'

async function checkedProject() {
  const userDir = process.cwd()
  checkMedia(userDir, await loadTakes(userDir))
  return { userDir, config: loadConfig(userDir) }
}

const commands = {
  async dev() {
    const { userDir, config } = await checkedProject()
    const { createServer } = await import('vite')
    const server = await createServer(makeViteConfig({ userDir, config }))
    await server.listen()
    server.printUrls()
  },
  async build() {
    const { userDir, config } = await checkedProject()
    const { build } = await import('vite')
    await build(makeViteConfig({ userDir, config }))
  },
  async check() {
    const { takes } = await checkDeck(process.cwd())
    const slides = flattenTakes(takes).length
    console.log(`deck: ok — ${slides} slides in ${takes.length} takes`)
  },
  async deploy() {
    const { userDir, config } = await checkedProject()
    if (!config.deploy)
      throw new Error('deck: deck.yaml has no deploy section — add deploy: { remote, repo } (see the README)')
    const { build } = await import('vite')
    await build(makeViteConfig({ userDir, config }))
    const { publish } = await import('../src/deploy/deploy.js')
    publish({ distDir: join(userDir, 'dist'), deploy: config.deploy })
    console.log(`deck: pushed dist/ to ${config.deploy.repo}`)
  },
}

const [command] = process.argv.slice(2)
if (!commands[command]) {
  console.error(USAGE)
  process.exit(1)
}
try {
  await commands[command]()
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
