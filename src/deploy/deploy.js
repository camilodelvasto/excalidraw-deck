import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import githubPages from './github-pages.js'
import codebergPages from './codeberg-pages.js'

export const adapters = { 'github-pages': githubPages, 'codeberg-pages': codebergPages }

// owner/name from an ssh or https clone URL; null for anything else (a local path in tests).
const SLUG = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/

export function pagesUrl(deploy) {
  const adapter = adapters[deploy.remote]
  if (!adapter) return null
  if (deploy.cname) return `https://${deploy.cname}/`
  const m = deploy.repo.includes(adapter.host) ? deploy.repo.match(SLUG) : null
  return m ? adapter.url(m[1].toLowerCase(), m[2].toLowerCase()) : null
}

export function publish({ distDir, deploy }) {
  const adapter = adapters[deploy.remote]
  if (!adapter) throw new Error(`deck: no adapter for "${deploy.remote}" (have: ${Object.keys(adapters).join(', ')})`)
  const branch = deploy.branch ?? adapter.defaultBranch
  const dir = mkdtempSync(join(tmpdir(), 'deck-deploy-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
  try {
    git('init', '-b', branch)
    // The force-push replaces the branch; only overwrite what a previous deploy produced.
    if (git('ls-remote', '--', deploy.repo, `refs/heads/${branch}`).toString().trim()) {
      git('fetch', '--depth', '1', '--', deploy.repo, branch)
      const subject = git('log', '-1', '--format=%s', 'FETCH_HEAD').toString().trim()
      if (subject !== 'deploy')
        throw new Error(
          `deck: branch "${branch}" on ${deploy.repo} has history that is not a previous deploy ("${subject}") — refusing to overwrite it. Use a dedicated pages branch, or delete it first.`
        )
    }
    cpSync(distDir, dir, { recursive: true })
    for (const f of adapter.files(deploy)) writeFileSync(join(dir, f.path), f.content)
    git('add', '-A')
    git('-c', 'user.name=deck', '-c', 'user.email=deck@localhost', '-c', 'commit.gpgsign=false', 'commit', '-m', 'deploy')
    git('push', '--force', '--', deploy.repo, `${branch}:${branch}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
