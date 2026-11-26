// Smallest surface: shell out to git; credentials are the user's ssh-agent — no tokens, no
// APIs, nothing stored. A pages branch is a build artifact: one commit, force-pushed;
// history there is noise. Adapters declare forge quirks only.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import githubPages from './github-pages.js'
import codebergPages from './codeberg-pages.js'

export const adapters = { 'github-pages': githubPages, 'codeberg-pages': codebergPages }

export function publish({ distDir, deploy }) {
  const adapter = adapters[deploy.remote]
  if (!adapter) throw new Error(`deck: no adapter for "${deploy.remote}" (have: ${Object.keys(adapters).join(', ')})`)
  const branch = deploy.branch ?? adapter.defaultBranch
  const dir = mkdtempSync(join(tmpdir(), 'deck-deploy-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
  try {
    cpSync(distDir, dir, { recursive: true })
    for (const f of adapter.files(deploy)) writeFileSync(join(dir, f.path), f.content)
    git('init', '-b', branch)
    git('add', '-A')
    git('-c', 'user.name=deck', '-c', 'user.email=deck@localhost', '-c', 'commit.gpgsign=false', 'commit', '-m', 'deploy')
    git('push', '--force', '--', deploy.repo, `${branch}:${branch}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
