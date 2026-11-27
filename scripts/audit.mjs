// npm audit with an allowlist: known advisories (with a written reason) pass,
// anything new fails. `npm audit` alone would be permanently red through the
// Excalidraw dependency tree, which hides new findings.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const allowlist = JSON.parse(readFileSync(new URL('../.audit-allowlist.json', import.meta.url), 'utf8'))
const allowed = new Set(allowlist.allow.map((a) => a.id))

let out
try {
  out = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
} catch (e) {
  if (!e.stdout) throw e
  out = e.stdout // npm audit exits non-zero when it finds anything
}

const found = new Map()
for (const v of Object.values(JSON.parse(out).vulnerabilities ?? {}))
  for (const via of v.via)
    if (typeof via === 'object') found.set(via.url.split('/').pop(), `${via.severity} ${via.name} — ${via.title} (${via.url})`)

const fresh = [...found].filter(([id]) => !allowed.has(id))
const stale = [...allowed].filter((id) => !found.has(id))
if (stale.length) console.log(`audit: ${stale.length} allowlisted advisories no longer reported — prune .audit-allowlist.json: ${stale.join(', ')}`)
if (fresh.length) {
  console.error(`audit: ${fresh.length} advisories not in .audit-allowlist.json:`)
  for (const [, line] of fresh) console.error(`  ${line}`)
  process.exit(1)
}
console.log(`audit: ok — ${found.size} known advisories allowlisted, 0 new`)
