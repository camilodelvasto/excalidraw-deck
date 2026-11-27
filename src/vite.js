import { createReadStream, existsSync, cpSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadConfig } from './config.js'
import { loadTakes } from './project.js'

const PKG = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)

export function excalidrawFontsDir() {
  const entry = require.resolve('@excalidraw/excalidraw')
  const root = entry.slice(0, entry.lastIndexOf(`${sep}dist${sep}`))
  const dir = join(root, 'dist', 'prod', 'fonts')
  if (!existsSync(dir)) throw new Error(`deck: Excalidraw fonts not found at ${dir}`)
  return dir
}

const MIME = {
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export function mime(path) {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

export function assetCandidates(url, userDir, fontsDir) {
  const jailed = (root, rel) => {
    const p = resolve(root, rel)
    return p.startsWith(root + sep) ? p : null
  }
  if (url.startsWith('/fonts/')) return [jailed(userDir, url.slice(1)), jailed(fontsDir, url.slice('/fonts/'.length))].filter(Boolean)
  if (url.startsWith('/media/')) return [jailed(userDir, url.slice(1))].filter(Boolean)
  return []
}

function deckVirtuals(userDir) {
  // Both virtuals read their file fresh on every load — slides.json and deck.yaml are
  // parsed as data, never executed.
  const sources = {
    [join(userDir, 'slides.json')]: '\0deck-slides',
    [join(userDir, 'deck.yaml')]: '\0deck-config',
  }
  return {
    name: 'deck-virtuals',
    resolveId(id) {
      if (id === 'virtual:deck-slides') return '\0deck-slides'
      if (id === 'virtual:deck-config') return '\0deck-config'
    },
    load(id) {
      if (id === '\0deck-slides') return `export const takes = ${JSON.stringify(loadTakes(userDir))}`
      if (id === '\0deck-config') return `export default ${JSON.stringify(loadConfig(userDir))}`
    },
    // An edit to either file reloads the page with the new data.
    configureServer(server) {
      server.watcher.add(Object.keys(sources))
      server.watcher.on('all', (event, path) => {
        const id = sources[path]
        if (!id) return
        const mod = server.moduleGraph.getModuleById(id)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

function deckAssets(userDir) {
  const fonts = excalidrawFontsDir()
  return {
    name: 'deck-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let url
        try {
          url = decodeURIComponent(req.url.split('?')[0])
        } catch {
          return next()
        }
        // The user's files are tried first for /fonts/ so a theme can override Excalidraw's faces.
        const candidates = assetCandidates(url, userDir, fonts)
        const hit = candidates.find((p) => existsSync(p))
        if (!hit) return next()
        res.setHeader('content-type', mime(hit))
        createReadStream(hit).pipe(res)
      })
    },
    writeBundle(options) {
      cpSync(fonts, join(options.dir, 'fonts'), { recursive: true })
      for (const sub of ['fonts', 'media'])
        if (existsSync(join(userDir, sub))) cpSync(join(userDir, sub), join(options.dir, sub), { recursive: true })
    },
  }
}

// command is 'dev' or 'build'; each gets its own cache so a build run mid-presentation
// cannot rewrite the optimized-deps chunks a live dev server is serving.
export function makeViteConfig({ userDir, command }) {
  return {
    configFile: false,
    root: join(PKG, 'app'),
    base: './',
    publicDir: false,
    cacheDir: join(userDir, '.cache', 'excalidraw-deck', command),
    plugins: [react(), deckVirtuals(userDir), deckAssets(userDir)],
    server: { fs: { allow: [PKG, userDir] } },
    build: { outDir: join(userDir, 'dist'), emptyOutDir: true },
  }
}
