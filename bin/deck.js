#!/usr/bin/env node
// excalidraw-deck: the user's project is data (slides.js + deck.yaml + media/);
// this binary owns the toolchain. dev serves, build emits dist/, deploy publishes it.
const USAGE = 'usage: excalidraw-deck dev | build | deploy'

const commands = {
  async dev() { throw new Error('deck: dev not wired yet') },
  async build() { throw new Error('deck: build not wired yet') },
  async deploy() { throw new Error('deck: deploy not wired yet') },
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
