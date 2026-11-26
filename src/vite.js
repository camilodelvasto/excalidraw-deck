// The CLI drives Vite through its JS API. root is the package's app/; the user's project
// arrives through two virtual modules; fonts and media never touch a CDN — in dev they are
// served from the Excalidraw package and the user's folder, a build copies them into dist/.
import { createReadStream, existsSync, cpSync } from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

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

// Dev-middleware path resolution: a url maps to candidate files, each jailed to its root.
// A path that escapes its root (..) is dropped — not an error, just not served.
export function assetCandidates(url, userDir, fontsDir) {
  const jailed = (root, rel) => {
    const p = resolve(root, rel)
    return p.startsWith(root + sep) ? p : null
  }
  if (url.startsWith('/fonts/')) return [jailed(userDir, url.slice(1)), jailed(fontsDir, url.slice('/fonts/'.length))].filter(Boolean)
  if (url.startsWith('/media/')) return [jailed(userDir, url.slice(1))].filter(Boolean)
  return []
}

// virtual:deck-slides is the user's slides.js; virtual:deck-config is the merged deck.yaml.
function deckVirtuals(userDir, config) {
  return {
    name: 'deck-virtuals',
    resolveId(id) {
      if (id === 'virtual:deck-slides') return join(userDir, 'slides.js')
      if (id === 'virtual:deck-config') return '\0deck-config'
    },
    load(id) {
      if (id === '\0deck-config') return `export default ${JSON.stringify(config)}`
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
        // The user's own files win /fonts/ (theme swaps live there); Excalidraw's families fill the rest.
        // assetCandidates jails each path to its root — traversal attempts are dropped silently.
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

export function makeViteConfig({ userDir, config }) {
  return {
    configFile: false,
    root: join(PKG, 'app'),
    base: './',
    publicDir: false,
    cacheDir: join(userDir, '.cache', 'excalidraw-deck'),
    plugins: [react(), deckVirtuals(userDir, config), deckAssets(userDir)],
    server: { fs: { allow: [PKG, userDir] } },
    build: { outDir: join(userDir, 'dist'), emptyOutDir: true },
  }
}
