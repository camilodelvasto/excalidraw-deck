#!/usr/bin/env node
import { loadConfig } from '../src/config.js'
import { loadTakes, checkMedia } from '../src/project.js'
import { makeViteConfig } from '../src/vite.js'
import { checkDeck } from '../src/check.js'
import { flattenTakes } from '../src/build.js'
import { join, resolve } from 'node:path'

const USAGE = 'usage: excalidraw-deck dev | build | deploy | check [dir]'

async function checkedProject() {
  const userDir = process.cwd()
  checkMedia(userDir, await loadTakes(userDir))
  return { userDir, config: loadConfig(userDir) }
}

const commands = {
  async dev() {
    const { userDir } = await checkedProject()
    const { createServer } = await import('vite')
    const server = await createServer(makeViteConfig({ userDir, command: 'dev' }))
    await server.listen()
    server.printUrls()
  },
  async build() {
    const { userDir } = await checkedProject()
    const { build } = await import('vite')
    await build(makeViteConfig({ userDir, command: 'build' }))
  },
  async check() {
    const dir = process.argv[3] ? resolve(process.argv[3]) : process.cwd()
    const { takes } = await checkDeck(dir)
    const slides = flattenTakes(takes).length
    console.log(`deck: ok — ${slides} slides in ${takes.length} takes`)
  },
  async deploy() {
    const { userDir, config } = await checkedProject()
    if (!config.deploy)
      throw new Error('deck: deck.yaml has no deploy section — add deploy: { remote, repo } (see the README)')
    const { build } = await import('vite')
    await build(makeViteConfig({ userDir, command: 'build' }))
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
