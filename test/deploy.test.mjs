// The deployer against local bare repos as fake remotes: real git, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publish, adapters } from '../src/deploy/deploy.js'

// publish uses the caller's git identity; give the test process one of its own.
process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'test'
process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = 'test@localhost'

const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

function fakeRemote() {
  const dir = mkdtempSync(join(tmpdir(), 'deck-remote-'))
  sh(dir, 'init', '--bare')
  return dir
}

function dist() {
  const dir = mkdtempSync(join(tmpdir(), 'deck-dist-'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html>deck')
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'assets', 'app.js'), '//app')
  return dir
}

const tree = (remote, branch) => sh(remote, 'ls-tree', '-r', '--name-only', branch).trim().split('\n').sort()
const commits = (remote, branch) => sh(remote, 'rev-list', '--count', branch).trim()
const file = (remote, branch, path) => sh(remote, 'show', `${branch}:${path}`)

test('github-pages: dist + .nojekyll + CNAME land as one commit on gh-pages', () => {
  const remote = fakeRemote()
  publish({ distDir: dist(), deploy: { remote: 'github-pages', repo: remote, branch: null, cname: 'deck.example.com' } })
  assert.deepEqual(tree(remote, 'gh-pages'), ['.nojekyll', 'CNAME', 'assets/app.js', 'index.html'])
  assert.equal(file(remote, 'gh-pages', 'CNAME'), 'deck.example.com\n')
  assert.equal(commits(remote, 'gh-pages'), '1')
})

test('github-pages without a cname writes no CNAME; an explicit branch wins', () => {
  const remote = fakeRemote()
  publish({ distDir: dist(), deploy: { remote: 'github-pages', repo: remote, branch: 'site', cname: null } })
  assert.deepEqual(tree(remote, 'site'), ['.nojekyll', 'assets/app.js', 'index.html'])
})

test('codeberg-pages: .domains carries the cname; the convention branch is pages', () => {
  const remote = fakeRemote()
  publish({ distDir: dist(), deploy: { remote: 'codeberg-pages', repo: remote, branch: null, cname: 'deck.example.org' } })
  assert.deepEqual(tree(remote, 'pages'), ['.domains', 'assets/app.js', 'index.html'])
  assert.equal(file(remote, 'pages', '.domains'), 'deck.example.org\n')
})

test('a pages branch is a build artifact: a second publish force-pushes, history stays at one commit', () => {
  const remote = fakeRemote()
  const deploy = { remote: 'github-pages', repo: remote, branch: null, cname: null }
  publish({ distDir: dist(), deploy })
  const second = dist()
  writeFileSync(join(second, 'index.html'), '<!doctype html>deck v2')
  publish({ distDir: second, deploy })
  assert.equal(commits(remote, 'gh-pages'), '1')
  assert.match(file(remote, 'gh-pages', 'index.html'), /deck v2/)
})

test('both adapters honor the same contract', () => {
  for (const [key, adapter] of Object.entries(adapters)) {
    assert.equal(adapter.name, key)
    assert.equal(typeof adapter.defaultBranch, 'string')
    assert.ok(Array.isArray(adapter.files({ cname: null })))
  }
})
